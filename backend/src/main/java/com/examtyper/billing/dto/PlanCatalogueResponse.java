package com.examtyper.billing.dto;

import java.util.List;

/**
 * The plans, and whether the candidate can pay for them.
 *
 * @param plans           the plans on offer
 * @param paymentsEnabled true when a gateway is available
 * @param mode            the mode the application is running in
 */
public record PlanCatalogueResponse(
        List<PlanResponse> plans,
        boolean paymentsEnabled,
        String mode
) {
}
