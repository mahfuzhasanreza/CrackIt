export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Changes on every submission so clients can react (close dialogs, show toasts). */
  submittedAt?: number;
};

export const initialActionState: ActionState = { status: "idle" };
