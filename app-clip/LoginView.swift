import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "lock.shield.fill")
                .font(.system(size: 50))
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

            VStack(spacing: 14) {
                TextField("אימייל", text: $email)
                    .textFieldStyle(.plain)
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(12)
                    .foregroundColor(.white)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .environment(\.layoutDirection, .rightToLeft)

                SecureField("סיסמה", text: $password)
                    .textFieldStyle(.plain)
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(12)
                    .foregroundColor(.white)
                    .textContentType(.password)
                    .environment(\.layoutDirection, .rightToLeft)
            }
            .padding(.horizontal)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }

            Button(action: login) {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("התחברות")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(red: 59/255, green: 130/255, blue: 246/255))
                .foregroundColor(.white)
                .cornerRadius(14)
            }
            .disabled(email.isEmpty || password.isEmpty || isLoading)
            .padding(.horizontal)

            Spacer()
            Spacer()
        }
    }

    private func login() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await APIService.shared.login(email: email, password: password)
                await MainActor.run {
                    appState.isLoggedIn = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "שם משתמש או סיסמה לא נכונים"
                    isLoading = false
                }
            }
        }
    }
}
