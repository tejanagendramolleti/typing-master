package com.examtyper.billing.dto;

import com.examtyper.billing.entity.Plan;

import java.util.List;

/**
 * The public view of a plan.
 */
public record PlanResponse(
        String code,
        String name,
        String description,
        int pricePaise,
        String currency,
        int durationDays,
        String interval,
        List<String> features,
        boolean highlighted,
        boolean active
) {
    public static PlanResponse from(Plan plan) {
        return new PlanResponse(
                plan.getCode(),
                plan.getName(),
                plan.getDescription(),
                plan.getPricePaise(),
                plan.getCurrency(),
                plan.getDurationDays(),
                plan.getInterval(),
                plan.featureList(),
                "PRO-MONTHLY".equals(plan.getCode()),
                plan.isActive());
    }
}
