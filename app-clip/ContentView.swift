import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color(red: 15/255, green: 23/255, blue: 42/255)
                .ignoresSafeArea()

            if let lockId = appState.lockId {
                if appState.isLoggedIn {
                    LockView(lockId: lockId)
                        .environmentObject(appState)
                } else {
                    LoginView()
                        .environmentObject(appState)
                }
            } else {
                WaitingView()
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct WaitingView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.shield")
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(red: 0.23, green: 0.85, blue: 0.78),
                                 Color(red: 0.22, green: 0.73, blue: 0.35)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text("LatchLog")
                .font(.title.bold())
                .foregroundColor(.white)
            Text("סרוק תג NFC או QR כדי להתחיל")
                .font(.subheadline)
                .foregroundColor(.gray)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
