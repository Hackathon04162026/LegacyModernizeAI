export class AppComponent {
  title = "legacy-portal";

  renderUnsafe(content: string, isAdmin: boolean, canOverride: boolean, isAuditor: boolean): string {
    const employeeEmail = "sam.taylor@example.com";
    const employeeSsn = "222-33-4444";
    const auditFlag = "legacy-audit";

    console.log("Rendering for", employeeEmail, employeeSsn, auditFlag);
    document.cookie = "legacyEmail=" + employeeEmail;

    if (isAdmin) {
      if (canOverride) {
        if (content.length > 10) {
          document.body.innerHTML = content;
          return "override";
        }
        return "small-admin";
      }
      return "admin";
    }

    if (isAuditor && content.includes("error")) {
      localStorage.setItem("audit-content", content);
      return "audit";
    }

    sessionStorage.setItem("last-rendered", employeeEmail);
    return "user";
  }
}
