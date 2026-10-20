package com.examtyper.user;

import com.examtyper.common.config.AppProperties;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ConflictException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.common.error.NotFoundException;
import com.examtyper.security.JwtService;
import com.examtyper.user.dto.AuthResponse;
import com.examtyper.user.dto.ForgotPasswordRequest;
import com.examtyper.user.dto.LoginRequest;
import com.examtyper.user.dto.RefreshRequest;
import com.examtyper.user.dto.RegisterRequest;
import com.examtyper.user.dto.ResetPasswordRequest;
import com.examtyper.user.dto.UpdateProfileRequest;
import com.examtyper.user.dto.UserResponse;
import com.examtyper.user.mail.MailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Registration, login, token rotation and password reset.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int PASSWORD_RESET_TTL_MINUTES = 30;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailSender mailSender;
    private final AppProperties appProperties;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       MailSender mailSender,
                       AppProperties appProperties) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailSender = mailSender;
        this.appProperties = appProperties;
    }

    // -----------------------------------------------------------------
    // Registration
    // -----------------------------------------------------------------

    @Transactional
    public AuthResponse register(RegisterRequest request, String userAgent, String ipAddress) {
        String email = normaliseEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        user.setPreferredExamCode(request.preferredExamCode());
        user.setPreferredLanguage(request.preferredLanguage());
        user.setTargetWpm(request.targetWpm());
        user.setRole(Role.USER);
        user.setStatus(UserStatus.ACTIVE);
        // Email verification is mocked for now, so new accounts start verified.
        user.setEmailVerified(true);
        user.setLastLoginAt(Instant.now());
        user = userRepository.save(user);

        log.info("Registered user {} ({})", user.getId(), email);
        return issueTokens(user, userAgent, ipAddress);
    }

    // -----------------------------------------------------------------
    // Login
    // -----------------------------------------------------------------

    @Transactional
    public AuthResponse login(LoginRequest request, String userAgent, String ipAddress) {
        String email = normaliseEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        // Always run a password check so that a missing account and a wrong
        // password take a comparable amount of time.
        String hash = user == null
                ? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin"
                : user.getPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);

        if (user == null || !passwordMatches) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ACCOUNT_DISABLED);
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        return issueTokens(user, userAgent, ipAddress);
    }

    // -----------------------------------------------------------------
    // Refresh
    // -----------------------------------------------------------------

    @Transactional
    public AuthResponse refresh(RefreshRequest request, String userAgent, String ipAddress) {
        String hash = jwtService.hashRefreshToken(request.refreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN, "Refresh token is not recognised"));

        Instant now = Instant.now();
        if (!stored.isUsable(now)) {
            // A revoked token being replayed is a strong signal of theft:
            // revoke the whole family so the attacker gains nothing.
            if (stored.isRevoked()) {
                refreshTokenRepository.revokeAllForUser(stored.getUserId(), now);
                log.warn("Revoked refresh token replayed for user {}; revoked all sessions", stored.getUserId());
            }
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "Refresh token has expired or been revoked");
        }

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ACCOUNT_DISABLED);
        }

        // Rotate: revoke this token and issue a replacement.
        AuthResponse response = issueTokens(user, userAgent, ipAddress);
        stored.setRevoked(true);
        stored.setRevokedAt(now);
        stored.setReplacedBy(jwtService.hashRefreshToken(response.refreshToken()));
        refreshTokenRepository.save(stored);
        return response;
    }

    // -----------------------------------------------------------------
    // Logout
    // -----------------------------------------------------------------

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
    }

    @Transactional
    public void logoutAll(Long userId) {
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
    }

    // -----------------------------------------------------------------
    // Password reset
    // -----------------------------------------------------------------

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normaliseEmail(request.email());
        Optional<User> maybeUser = userRepository.findByEmailIgnoreCase(email);

        // Always report success so the endpoint cannot be used to discover
        // which email addresses have accounts.
        if (maybeUser.isEmpty()) {
            log.info("Password reset requested for unknown email {}", email);
            return;
        }

        User user = maybeUser.get();
        String rawToken = UUIDish.random();
        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setTokenHash(sha256(rawToken));
        token.setExpiresAt(Instant.now().plus(PASSWORD_RESET_TTL_MINUTES, ChronoUnit.MINUTES));
        passwordResetTokenRepository.save(token);

        String link = appProperties.getFrontend().getBaseUrl() + "/reset-password?token=" + rawToken;
        mailSender.send(user.getEmail(), "Reset your ExamTyper password",
                "Hello " + user.getDisplayName() + ",\n\n"
                        + "Use the link below to choose a new password. It expires in "
                        + PASSWORD_RESET_TTL_MINUTES + " minutes.\n\n"
                        + link + "\n\n"
                        + "If you did not ask for this, you can ignore this email.\n");
        log.info("Password reset token issued for {}", email);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(sha256(request.token()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN, "Reset token is not valid"));

        Instant now = Instant.now();
        if (!token.isUsable(now)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "Reset token has expired or has already been used");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> NotFoundException.of("User", token.getUserId()));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        token.setUsed(true);
        passwordResetTokenRepository.save(token);

        // A password change invalidates every existing session.
        refreshTokenRepository.revokeAllForUser(user.getId(), now);
        log.info("Password reset completed for user {}", user.getId());
    }

    // -----------------------------------------------------------------
    // Profile
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public UserResponse currentUser(Long userId) {
        return UserResponse.from(userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.of("User", userId)));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.of("User", userId));

        if (request.displayName() != null && !request.displayName().isBlank()) {
            user.setDisplayName(request.displayName().trim());
        }
        if (request.preferredExamCode() != null) {
            user.setPreferredExamCode(request.preferredExamCode().isBlank() ? null : request.preferredExamCode());
        }
        if (request.preferredLanguage() != null) {
            user.setPreferredLanguage(request.preferredLanguage().isBlank() ? null : request.preferredLanguage());
        }
        if (request.targetWpm() != null) {
            user.setTargetWpm(request.targetWpm());
        }
        if (request.leaderboardOptOut() != null) {
            user.setLeaderboardOptOut(request.leaderboardOptOut());
        }
        if (request.showEmailOnLeaderboard() != null) {
            user.setShowEmailOnLeaderboard(request.showEmailOnLeaderboard());
        }
        if (request.timezone() != null && !request.timezone().isBlank()) {
            user.setTimezone(request.timezone().trim());
        }

        return UserResponse.from(userRepository.save(user));
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private AuthResponse issueTokens(User user, String userAgent, String ipAddress) {
        String accessToken = jwtService.issueAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken();

        RefreshToken stored = new RefreshToken();
        stored.setUserId(user.getId());
        stored.setTokenHash(jwtService.hashRefreshToken(refreshToken));
        stored.setExpiresAt(Instant.now().plus(jwtService.getRefreshTtlDays(), ChronoUnit.DAYS));
        stored.setUserAgent(truncate(userAgent, 300));
        stored.setIpAddress(truncate(ipAddress, 64));
        refreshTokenRepository.save(stored);

        long expiresIn = jwtService.getAccessTtlMinutes() * 60;
        return AuthResponse.of(accessToken, refreshToken, expiresIn, UserResponse.from(user));
    }

    private static String normaliseEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    /** A small helper for generating opaque, URL-safe tokens. */
    private static final class UUIDish {
        static String random() {
            return java.util.UUID.randomUUID().toString().replace("-", "")
                    + java.util.UUID.randomUUID().toString().replace("-", "");
        }
    }
}
