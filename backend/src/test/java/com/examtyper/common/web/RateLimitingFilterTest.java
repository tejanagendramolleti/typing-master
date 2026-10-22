package com.examtyper.common.web;

import com.examtyper.common.config.AppProperties;
import com.examtyper.support.PostgresIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The rate limiter.
 *
 * <p>The limiter is a filter, and it counts what a client does rather than
 * what a test asks for, so it is checked through the real HTTP layer. The
 * limits are configuration now — an operator behind a shared address needs
 * a more generous one — and the defaults have to stay the ones the
 * application has always used.
 */
@AutoConfigureMockMvc
@DisplayName("The rate limiter")
class RateLimitingFilterTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppProperties appProperties;

    @Test
    @DisplayName("the registration limit is five in ten minutes by default")
    void theRegistrationLimitIsFiveInTenMinutesByDefault() {
        AppProperties.Endpoint register = appProperties.getRateLimit().getRegister();

        assertThat(register.getRequests()).isEqualTo(5);
        assertThat(register.getPeriod()).isEqualTo(Duration.ofMinutes(10));
    }

    @Test
    @DisplayName("the sixth registration from one address is turned away")
    void theSixthRegistrationFromOneAddressIsTurnedAway() throws Exception {
        String address = "203.0.113.7";

        for (int attempt = 1; attempt <= 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/register")
                            .header("X-Forwarded-For", address)
                            .contentType("application/json")
                            .content("{}"))
                    .andExpect(status().is4xxClientError())
                    .andExpect(jsonPath("$.code").value(not("RATE_LIMITED")));
        }

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", address)
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    @DisplayName("the allowance of one address is not spent by another")
    void theAllowanceOfOneAddressIsNotSpentByAnother() throws Exception {
        String address = "203.0.113.8";

        for (int attempt = 1; attempt <= 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/register")
                            .header("X-Forwarded-For", address)
                            .contentType("application/json")
                            .content("{}"))
                    .andExpect(status().is4xxClientError());
        }

        // A different address has its own bucket, so it is still allowed.
        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", "203.0.113.9")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.code").value(not("RATE_LIMITED")));
    }

    @Test
    @DisplayName("the limit is counted per endpoint, not across the whole application")
    void theLimitIsCountedPerEndpoint() throws Exception {
        String address = "203.0.113.10";

        for (int attempt = 1; attempt <= 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/register")
                            .header("X-Forwarded-For", address)
                            .contentType("application/json")
                            .content("{}"))
                    .andExpect(status().is4xxClientError());
        }

        // The registration allowance is spent, but the login allowance is
        // a separate one.
        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Forwarded-For", address)
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.code").value(not("RATE_LIMITED")));
    }
}
