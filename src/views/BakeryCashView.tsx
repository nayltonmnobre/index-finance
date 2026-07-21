/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useBPOState } from "../hooks/useBPOState";
import OperatorApp from "./bakery/OperatorApp";
import AdminDashboard from "./bakery/AdminDashboard";

export default function BakeryCashView() {
  const { currentUser } = useBPOState();
  return ["BPO_ADMIN", "BPO_TEAM"].includes(currentUser.role) ? (
    <AdminDashboard />
  ) : (
    <OperatorApp />
  );
}
