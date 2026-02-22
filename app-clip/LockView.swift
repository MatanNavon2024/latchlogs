import SwiftUI

struct LockView: View {
    let lockId: String
    @EnvironmentObject var appState: AppState

    @State private var lock: Lock?
    @State private var currentAction: String = "unknown"
    @State private var lastEventTime: String?
    @State private var isLoading = true
    @State private var isToggling = false
    @State private var errorMessage: String?

    private var isLocked: Bool { currentAction == "lock" }

    private var statusColor: Color {
        switch currentAction {
        case "lock": return Color(red: 0.13, green: 0.55, blue: 0.13)
        case "unlock": return Color(red: 0.85, green: 0.25, blue: 0.15)
        default: return Color.gray
        }
    }

    private var statusText: String {
        switch currentAction {
        case "lock": return "נעול"
        case "unlock": return "פתוח"
        default: return "לא ידוע"
        }
    }

    private var statusIcon: String {
        switch currentAction {
        case "lock": return "lock.fill"
        case "unlock": return "lock.open.fill"
        default: return "questionmark.circle"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                Spacer()
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
                Spacer()
            } else if let lock = lock {
                lockContent(lock)
            } else {
                errorView
            }
        }
        .task { await loadData() }
    }

    @ViewBuilder
    private func lockContent(_ lock: Lock) -> some View {
        Spacer()

        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 140, height: 140)
                Image(systemName: statusIcon)
                    .font(.system(size: 60))
                    .foregroundColor(statusColor)
            }

            Text(lock.name)
                .font(.title.bold())
                .foregroundColor(.white)

            Text(statusText)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(statusColor)
                .environment(\.layoutDirection, .rightToLeft)

            if let time = lastEventTime {
                Text(timeAgo(from: time))
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }

        Spacer()

        if let error = errorMessage {
            Text(error)
                .font(.caption)
                .foregroundColor(.red)
                .padding(.bottom, 8)
        }

        Button(action: toggle) {
            HStack(spacing: 10) {
                if isToggling {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: isLocked ? "lock.open.fill" : "lock.fill")
                        .font(.title3)
                    Text(isLocked ? "פתח" : "נעל")
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(Color(red: 59/255, green: 130/255, blue: 246/255))
            .foregroundColor(.white)
            .cornerRadius(16)
        }
        .disabled(isToggling || currentAction == "unknown")
        .padding(.horizontal, 24)
        .padding(.bottom, 40)

        Button("התנתק") {
            Task {
                await APIService.shared.logout()
                await MainActor.run { appState.isLoggedIn = false }
            }
        }
        .font(.caption)
        .foregroundColor(.gray)
        .padding(.bottom, 20)
    }

    private var errorView: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundColor(.orange)
            Text("לא נמצא מנעול")
                .font(.headline)
                .foregroundColor(.white)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }

    private func loadData() async {
        do {
            let fetchedLock = try await APIService.shared.fetchLock(id: lockId)
            let event = try await APIService.shared.fetchLatestEvent(lockId: lockId)
            await MainActor.run {
                lock = fetchedLock
                currentAction = event?.action ?? "unknown"
                lastEventTime = event?.created_at
                isLoading = false
            }
        } catch is APIError {
            await MainActor.run {
                appState.isLoggedIn = false
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    private func toggle() {
        isToggling = true
        errorMessage = nil
        let newAction = isLocked ? "unlock" : "lock"
        Task {
            do {
                let event = try await APIService.shared.toggleLock(lockId: lockId, newAction: newAction)
                await MainActor.run {
                    currentAction = event.action
                    lastEventTime = event.created_at
                    isToggling = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "שגיאה בעדכון הסטטוס"
                    isToggling = false
                }
            }
        }
    }

    private func timeAgo(from isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }
        let seconds = Int(Date().timeIntervalSince(date))
        if seconds < 60 { return "לפני \(seconds) שניות" }
        if seconds < 3600 { return "לפני \(seconds / 60) דקות" }
        if seconds < 86400 { return "לפני \(seconds / 3600) שעות" }
        return "לפני \(seconds / 86400) ימים"
    }
}
