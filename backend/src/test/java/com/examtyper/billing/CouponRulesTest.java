package com.examtyper.billing;

import com.examtyper.billing.entity.Coupon;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The coupon rules.
 *
 * <p>These are pure calculations on the coupon itself, so they are tested
 * without a database. The redemption limits are tested in the integration
 * test, because they are counts against the redemptions table.
 */
@DisplayName("The coupon rules")
class CouponRulesTest {

    /**
     * A percentage coupon.
     */
    private static Coupon percentage(String value) {
        Coupon coupon = new Coupon();
        coupon.setCode("SAVE" + value);
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(new BigDecimal(value));
        coupon.setActive(true);
        return coupon;
    }

    /**
     * A flat coupon.
     */
    private static Coupon flat(int paise) {
        Coupon coupon = new Coupon();
        coupon.setCode("FLAT" + paise);
        coupon.setDiscountType("FLAT");
        coupon.setDiscountValue(BigDecimal.valueOf(paise));
        coupon.setActive(true);
        return coupon;
    }

    @Nested
    @DisplayName("the percentage discount")
    class PercentageDiscount {

        @Test
        @DisplayName("takes the stated share of the price")
        void takesTheStatedShare() {
            assertThat(percentage("10").discountOn(14900)).isEqualTo(1490);
        }

        @Test
        @DisplayName("is rounded down, so it never exceeds the price")
        void isRoundedDown() {
            // 33% of 149 rupees is 49.17 rupees, which is 4917 paise.
            assertThat(percentage("33").discountOn(14900)).isEqualTo(4917);
        }

        @Test
        @DisplayName("is zero on a free plan")
        void isZeroOnAFreePlan() {
            assertThat(percentage("50").discountOn(0)).isZero();
        }

        @Test
        @DisplayName("is the whole price at a hundred per cent")
        void isTheWholePriceAtAHundredPercent() {
            assertThat(percentage("100").discountOn(14900)).isEqualTo(14900);
        }

        @Test
        @DisplayName("is not capped at the price, so the service must clamp the total")
        void isNotCappedAtThePrice() {
            // A coupon of 500% is a configuration mistake. The discount
            // itself is not capped, because a cap here would hide the
            // mistake; the total is clamped where the order is made.
            assertThat(percentage("500").discountOn(14900)).isEqualTo(74500);
        }
    }

    @Nested
    @DisplayName("the flat discount")
    class FlatDiscount {

        @Test
        @DisplayName("takes the stated amount")
        void takesTheStatedAmount() {
            assertThat(flat(5000).discountOn(14900)).isEqualTo(5000);
        }

        @Test
        @DisplayName("takes the whole price when it is bigger than the price")
        void takesTheWholePriceWhenBigger() {
            assertThat(flat(50000).discountOn(14900)).isEqualTo(50000);
        }

        @Test
        @DisplayName("is zero when it is zero")
        void isZeroWhenItIsZero() {
            assertThat(flat(0).discountOn(14900)).isZero();
        }
    }

    @Nested
    @DisplayName("when the coupon can be used")
    class Usability {

        @Test
        @DisplayName("an active coupon with no dates can be used")
        void anActiveCouponWithNoDatesCanBeUsed() {
            assertThat(percentage("10").isUsableAt(Instant.now())).isTrue();
        }

        @Test
        @DisplayName("an inactive coupon cannot be used")
        void anInactiveCouponCannotBeUsed() {
            Coupon coupon = percentage("10");
            coupon.setActive(false);
            assertThat(coupon.isUsableAt(Instant.now())).isFalse();
        }

        @Test
        @DisplayName("a coupon that has not started yet cannot be used")
        void aCouponThatHasNotStartedCannotBeUsed() {
            Coupon coupon = percentage("10");
            coupon.setStartsAt(Instant.now().plus(1, ChronoUnit.DAYS));
            assertThat(coupon.isUsableAt(Instant.now())).isFalse();
        }

        @Test
        @DisplayName("a coupon that has started can be used")
        void aCouponThatHasStartedCanBeUsed() {
            Coupon coupon = percentage("10");
            coupon.setStartsAt(Instant.now().minus(1, ChronoUnit.DAYS));
            assertThat(coupon.isUsableAt(Instant.now())).isTrue();
        }

        @Test
        @DisplayName("a coupon that has expired cannot be used")
        void aCouponThatHasExpiredCannotBeUsed() {
            Coupon coupon = percentage("10");
            coupon.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));
            assertThat(coupon.isUsableAt(Instant.now())).isFalse();
        }

        @Test
        @DisplayName("a coupon that expires in the future can be used")
        void aCouponThatExpiresInTheFutureCanBeUsed() {
            Coupon coupon = percentage("10");
            coupon.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));
            assertThat(coupon.isUsableAt(Instant.now())).isTrue();
        }
    }
}
