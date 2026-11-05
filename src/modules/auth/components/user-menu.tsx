import { requireUser } from "../dal";

import { UserMenuDropdown } from "./user-menu-dropdown";

/** Server part: resolves the user. Render inside <Suspense>. */
export async function UserMenu() {
  const user = await requireUser();
  return <UserMenuDropdown name={user.name} email={user.email} />;
}
