"use client";

import { RatingInput } from "@/components/rating-input";

const LABELS = ["", "Distracted", "Scattered", "Okay", "Focused", "Deep focus"];

/** 1–5 radio group submitted as `focusRating`. */
export function FocusRating({
  defaultValue,
  idPrefix,
}: {
  defaultValue?: number | null;
  idPrefix: string;
}) {
  return (
    <RatingInput
      name="focusRating"
      legend="Focus"
      labels={LABELS}
      defaultValue={defaultValue}
      idPrefix={idPrefix}
    />
  );
}
