package com.examtyper.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed view of the {@code app.*} configuration block.
 */
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String env = "dev";
    private Cors cors = new Cors();
    private Jwt jwt = new Jwt();
    private Mail mail = new Mail();
    private Payments payments = new Payments();
    private Ai ai = new Ai();
    private Seed seed = new Seed();
    private Frontend frontend = new Frontend();

    public String getEnv() {
        return env;
    }

    public void setEnv(String env) {
        this.env = env;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Mail getMail() {
        return mail;
    }

    public void setMail(Mail mail) {
        this.mail = mail;
    }

    public Payments getPayments() {
        return payments;
    }

    public void setPayments(Payments payments) {
        this.payments = payments;
    }

    public Ai getAi() {
        return ai;
    }

    public void setAi(Ai ai) {
        this.ai = ai;
    }

    public Seed getSeed() {
        return seed;
    }

    public void setSeed(Seed seed) {
        this.seed = seed;
    }

    public Frontend getFrontend() {
        return frontend;
    }

    public void setFrontend(Frontend frontend) {
        this.frontend = frontend;
    }

    public boolean isProd() {
        return "prod".equalsIgnoreCase(env);
    }

    public static class Cors {
        private String allowedOrigins = "http://localhost:3000";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Jwt {
        private String secret = "change-me-to-a-long-random-string-at-least-32-chars";
        private int accessTtlMinutes = 30;
        private int refreshTtlDays = 30;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public int getAccessTtlMinutes() {
            return accessTtlMinutes;
        }

        public void setAccessTtlMinutes(int accessTtlMinutes) {
            this.accessTtlMinutes = accessTtlMinutes;
        }

        public int getRefreshTtlDays() {
            return refreshTtlDays;
        }

        public void setRefreshTtlDays(int refreshTtlDays) {
            this.refreshTtlDays = refreshTtlDays;
        }
    }

    public static class Mail {
        private String mode = "console";
        private String from = "no-reply@examtyper.local";

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }
    }

    public static class Payments {
        /** mock | manual | disabled */
        private String mode = "mock";

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }
    }

    public static class Ai {
        private boolean enabled = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }

    public static class Seed {
        private boolean demoUsers = true;
        private String adminEmail = "admin@examtyper.local";
        private String adminPassword = "Admin@12345";
        private String demoFreeEmail = "free@examtyper.local";
        private String demoFreePassword = "Free@12345";
        private String demoProEmail = "pro@examtyper.local";
        private String demoProPassword = "Pro@12345";

        public boolean isDemoUsers() {
            return demoUsers;
        }

        public void setDemoUsers(boolean demoUsers) {
            this.demoUsers = demoUsers;
        }

        public String getAdminEmail() {
            return adminEmail;
        }

        public void setAdminEmail(String adminEmail) {
            this.adminEmail = adminEmail;
        }

        public String getAdminPassword() {
            return adminPassword;
        }

        public void setAdminPassword(String adminPassword) {
            this.adminPassword = adminPassword;
        }

        public String getDemoFreeEmail() {
            return demoFreeEmail;
        }

        public void setDemoFreeEmail(String demoFreeEmail) {
            this.demoFreeEmail = demoFreeEmail;
        }

        public String getDemoFreePassword() {
            return demoFreePassword;
        }

        public void setDemoFreePassword(String demoFreePassword) {
            this.demoFreePassword = demoFreePassword;
        }

        public String getDemoProEmail() {
            return demoProEmail;
        }

        public void setDemoProEmail(String demoProEmail) {
            this.demoProEmail = demoProEmail;
        }

        public String getDemoProPassword() {
            return demoProPassword;
        }

        public void setDemoProPassword(String demoProPassword) {
            this.demoProPassword = demoProPassword;
        }
    }

    public static class Frontend {
        private String baseUrl = "http://localhost:3000";
        private String apiBaseUrl = "http://localhost:8080";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiBaseUrl() {
            return apiBaseUrl;
        }

        public void setApiBaseUrl(String apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl;
        }
    }
}
