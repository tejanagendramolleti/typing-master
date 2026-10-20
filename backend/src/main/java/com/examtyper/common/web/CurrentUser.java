package com.examtyper.common.web;

import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.security.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Convenience access to the authenticated principal from a controller.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    /**
     * The authenticated principal.
     *
     * @throws BusinessException if there is no authenticated user
     */
    public static AuthenticatedUser require() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new BusinessException(ErrorCode.UNAUTHENTICATED);
        }
        return user;
    }

    /**
     * The authenticated user's id.
     */
    public static Long requireId() {
        return require().getId();
    }

    /**
     * The authenticated user's id, or null when anonymous.
     */
    public static Long idOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.getId();
        }
        return null;
    }
}
