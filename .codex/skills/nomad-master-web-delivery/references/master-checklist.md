# Nomad Master Web Delivery Reference

## Current Module Map

Core modules:

1. login and authenticated shell
2. dashboard
3. inventory
4. mixes
5. rails
6. access
7. Telegram recipients and automation status
8. audit trail

## Role Rules

1. `nomad` staff can operate routine modules and daily codes.
2. `admin` has access to staff accounts and admin-only operational panels.
3. Frontend must not silently expose admin-only surfaces to non-admin roles.

## Frontend Verification Path

Run what matches the change:

1. `cd apps/nomad-master-web && npm run build`
2. manual smoke of the touched module
3. backend build if the UI depends on a changed contract

Useful manual smoke targets:

1. login and session restore;
2. module tab navigation;
3. CRUD form open/save/cancel;
4. admin-only visibility;
5. audit trail visibility after an operational action.

## Common Risk Areas

1. admin-only sections leaking to staff;
2. inconsistent CRUD patterns between modules;
3. operational labels becoming too product-marketing oriented;
4. auth shell regressions after visual or routing work.
