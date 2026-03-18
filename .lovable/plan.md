

## Remove "Signed" Option from Dashboard Status Dropdown

### Change
In `src/pages/Index.tsx`, remove `<SelectItem value="signed">Signed</SelectItem>` from the `Select` dropdown in the agreement rows. The dropdown will only offer "Draft" and "Sent".

Single line removal, no other changes.

