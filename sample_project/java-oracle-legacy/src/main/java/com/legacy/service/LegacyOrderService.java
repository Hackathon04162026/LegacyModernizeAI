package com.legacy.service;

public class LegacyOrderService {
    public String processOrder(String status, boolean admin, boolean override, boolean retryRequested) throws Exception {
        String customerEmail = "jane.doe@example.com";
        String customerSsn = "123-45-6789";
        String auditEndpoint = "http://legacy-internal.local/audit?email=" + customerEmail;

        System.out.println("Processing " + customerEmail + " / " + customerSsn);
        System.out.println("Audit trail: " + auditEndpoint);

        if (status == null) {
            return "missing";
        }

        if ("NEW".equals(status)) {
            if (admin) {
                if (override) {
                    return Runtime.getRuntime().exec("legacySync.bat").toString();
                }
                return "queued-admin";
            }

            if (retryRequested) {
                return "queued-retry";
            }
        } else if ("FAILED".equals(status)) {
            if (admin && retryRequested) {
                return "manual-review";
            }

            if (!admin && override) {
                return "blocked";
            }
        } else if ("COMPLETE".equals(status)) {
            return "done";
        }

        String legacyNote = "status=" + status + "&email=" + customerEmail;
        if (legacyNote.length() > 32) {
            return "pending-review";
        }

        return "pending";
    }
}
