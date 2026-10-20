package com.examtyper.user;

import com.examtyper.common.web.ApiResponse;
import com.examtyper.common.web.CurrentUser;
import com.examtyper.user.dto.AuthResponse;
import com.examtyper.user.dto.ForgotPasswordRequest;
import com.examtyper.user.dto.LoginRequest;
import com.examtyper.user.dto.RefreshRequest;
import com.examtyper.user.dto.RegisterRequest;
import com.examtyper.user.dto.ResetPasswordRequest;
import com.examtyper.user.dto.UpdateProfileRequest;
import com.examtyper.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registration, login, token refresh, password reset and profile endpoints.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Register, log in, refresh tokens and reset your password")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Create an account")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest httpRequest) {
        AuthResponse response = authService.register(
                request, httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Log in and receive an access and refresh token")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(
                request, httpRequest.getHeader("User-Agent"), clientIp(httpRequest)));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange a refresh token for a new token pair")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request,
                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(
                request, httpRequest.getHeader("User-Agent"), clientIp(httpRequest)));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke all refresh tokens for the current user")
    public ResponseEntity<ApiResponse<Void>> logout() {
        authService.logout(CurrentUser.requireId());
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset link")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        // Always 200 so the endpoint cannot be used to probe for accounts.
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Set a new password using a reset token")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    @GetMapping("/me")
    @Operation(summary = "The signed-in user's profile")
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(authService.currentUser(CurrentUser.requireId()));
    }

    @PutMapping("/me")
    @Operation(summary = "Update profile preferences")
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(CurrentUser.requireId(), request));
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            String first = comma > 0 ? forwarded.substring(0, comma) : forwarded;
            return first.trim();
        }
        return request.getRemoteAddr();
    }
}
