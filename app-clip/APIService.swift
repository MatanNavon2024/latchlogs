import Foundation

enum APIError: LocalizedError {
    case network(String)
    case unauthorized
    case notFound

    var errorDescription: String? {
        switch self {
        case .network(let msg): return msg
        case .unauthorized: return "Authentication required"
        case .notFound: return "Lock not found"
        }
    }
}

struct Lock: Codable {
    let id: String
    let name: String
    let group_id: String
}

struct LockEvent: Codable {
    let id: String
    let lock_id: String
    let user_id: String
    let action: String
    let source: String
    let created_at: String
}

struct AuthResponse: Codable {
    let access_token: String
    let user: AuthUser
}

struct AuthUser: Codable {
    let id: String
    let email: String?
}

actor APIService {
    static let shared = APIService()

    private let baseURL = "https://iwmxqnbqlktrwxtuzwjq.supabase.co"
    private let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bXhxbmJxbGt0cnd4dHV6d2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzcwMjksImV4cCI6MjA4NzAxMzAyOX0.kPjO5aPJp2d2QQiSfjWLK4h0uKPT3JIt_y9spV1WbNM"

    private var accessToken: String? {
        get { UserDefaults.standard.string(forKey: "accessToken") }
        set { UserDefaults.standard.set(newValue, forKey: "accessToken") }
    }

    private var userId: String? {
        get { UserDefaults.standard.string(forKey: "userId") }
        set { UserDefaults.standard.set(newValue, forKey: "userId") }
    }

    var isLoggedIn: Bool { accessToken != nil }
    var currentUserId: String? { userId }

    // MARK: - Auth

    func login(email: String, password: String) async throws {
        let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=password")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.network("No response") }

        if http.statusCode == 400 {
            throw APIError.unauthorized
        }
        guard http.statusCode == 200 else {
            throw APIError.network("Login failed (\(http.statusCode))")
        }

        let auth = try JSONDecoder().decode(AuthResponse.self, from: data)
        accessToken = auth.access_token
        userId = auth.user.id
    }

    func logout() {
        accessToken = nil
        userId = nil
    }

    // MARK: - Lock

    func fetchLock(id: String) async throws -> Lock {
        let url = URL(string: "\(baseURL)/rest/v1/locks?id=eq.\(id)&select=*")!
        let data = try await authorizedGet(url: url)
        let locks = try JSONDecoder().decode([Lock].self, from: data)
        guard let lock = locks.first else { throw APIError.notFound }
        return lock
    }

    func fetchLatestEvent(lockId: String) async throws -> LockEvent? {
        let url = URL(string: "\(baseURL)/rest/v1/events?lock_id=eq.\(lockId)&order=created_at.desc&limit=1&select=*")!
        let data = try await authorizedGet(url: url)
        let events = try JSONDecoder().decode([LockEvent].self, from: data)
        return events.first
    }

    func toggleLock(lockId: String, newAction: String) async throws -> LockEvent {
        guard let uid = userId else { throw APIError.unauthorized }
        let url = URL(string: "\(baseURL)/rest/v1/events")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken ?? "")", forHTTPHeaderField: "Authorization")
        req.setValue("return=representation", forHTTPHeaderField: "Prefer")

        let body: [String: String] = [
            "lock_id": lockId,
            "user_id": uid,
            "action": newAction,
            "source": "app_clip"
        ]
        req.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError.network("Failed to update lock")
        }
        let events = try JSONDecoder().decode([LockEvent].self, from: data)
        guard let event = events.first else { throw APIError.network("No event returned") }
        return event
    }

    // MARK: - Helpers

    private func authorizedGet(url: URL) async throws -> Data {
        var req = URLRequest(url: url)
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken ?? "")", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.network("No response") }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.network("Request failed (\(http.statusCode))")
        }
        return data
    }
}
