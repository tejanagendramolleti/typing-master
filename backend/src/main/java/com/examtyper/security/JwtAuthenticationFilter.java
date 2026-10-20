package com.examtyper.security;

import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import com.examtyper.user.UserStatus;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Reads the {@code Authorization: Bearer} header, validates the access token and
 * populates the security context.
 *
 * <p>The user's current status is re-read from the database so that disabling an
 * account takes effect immediately rather than when the access token expires.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER)) {
            String token = header.substring(BEARER.length()).trim();
            Claims claims = jwtService.tryParseAccessToken(token);
            if (claims != null) {
                try {
                    Long userId = Long.valueOf(claims.getSubject());
                    User user = userRepository.findById(userId).orElse(null);
                    if (user != null && user.getStatus() == UserStatus.ACTIVE) {
                        AuthenticatedUser principal = new AuthenticatedUser(
                                user.getId(),
                                user.getEmail(),
                                user.getDisplayName(),
                                user.getRole(),
                                true);
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    } else {
                        log.debug("Token valid but account {} is not active", userId);
                    }
                } catch (NumberFormatException e) {
                    log.debug("Access token subject is not a user id");
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
