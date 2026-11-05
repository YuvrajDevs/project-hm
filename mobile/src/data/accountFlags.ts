// Set while the account is being deleted, so the profile listener doesn't recreate the profile it just watched vanish.
let deleting = false;
export const rememberDeleting = (value: boolean) => { deleting = value; };
export const isDeleting = () => deleting;
