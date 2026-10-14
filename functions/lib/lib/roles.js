"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMinRole = hasMinRole;
const hierarchy = {
    super_admin: 4,
    admin: 3,
    department_admin: 2,
    member: 1,
};
function hasMinRole(role, min) {
    return hierarchy[role] >= hierarchy[min];
}
//# sourceMappingURL=roles.js.map