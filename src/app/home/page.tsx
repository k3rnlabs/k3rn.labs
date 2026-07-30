import { Suspense } from "react"
import DashboardPage from "@/components/dashboard/dashboard-page"

export const dynamic = "force-dynamic"

export default function HomeDashboard() {
    return (
        <Suspense fallback={null}>
            <DashboardPage />
        </Suspense>
    )
}
