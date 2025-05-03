type Role = "admin" | "modifier" | "user" | null;

export const routePermissions: {
  pathPrefix: string;
  allowedRoles: Role[];
}[] = [
  {
    pathPrefix: "/private/admin",
    allowedRoles: ["admin"],
  },
  {
    pathPrefix: "/private/crm",
    allowedRoles: ["admin", "modifier"],
  },
  {
    pathPrefix: "/private/profile",
    allowedRoles: ["admin", "modifier", "user"],
  },
];
