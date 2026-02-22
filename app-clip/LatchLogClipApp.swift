import SwiftUI

@main
struct LatchLogClipApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    guard let url = activity.webpageURL else { return }
                    if let lockId = extractLockId(from: url) {
                        appState.lockId = lockId
                    }
                }
                .onOpenURL { url in
                    if let lockId = extractLockId(from: url) {
                        appState.lockId = lockId
                    }
                }
        }
    }

    private func extractLockId(from url: URL) -> String? {
        let path = url.path
        let pattern = #"/clip/([a-f0-9\-]+)"#
        guard let range = path.range(of: pattern, options: .regularExpression) else { return nil }
        let match = String(path[range])
        return match.replacingOccurrences(of: "/clip/", with: "")
    }
}

class AppState: ObservableObject {
    @Published var lockId: String?
    @Published var isLoggedIn: Bool = false

    init() {
        Task {
            isLoggedIn = await APIService.shared.isLoggedIn
        }
    }
}
