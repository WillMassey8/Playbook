import UIKit
import UniformTypeIdentifiers

/// Question-free share: capture URL → show Saved ✓ → dismiss.
/// Categorization happens later in the main app as a full-screen intake.
class ShareViewController: UIViewController {

    private let statusLabel = UILabel()
    private let iconView = UIImageView()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1)
        buildChrome()
        setStatus("Saving…", systemImage: "arrow.down.circle", tint: .white)

        extractSharedURL { [weak self] url in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let url else {
                    self.failAndClose("Couldn't save — try again.")
                    return
                }
                self.capture(url)
            }
        }
    }

    // MARK: - UI

    private func buildChrome() {
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconView.contentMode = .scaleAspectFit
        iconView.tintColor = .white

        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.textColor = .white
        statusLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        statusLabel.textAlignment = .center
        statusLabel.numberOfLines = 2

        let stack = UIStackView(arrangedSubviews: [iconView, statusLabel])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            iconView.widthAnchor.constraint(equalToConstant: 44),
            iconView.heightAnchor.constraint(equalToConstant: 44),
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
    }

    private func setStatus(_ text: String, systemImage: String, tint: UIColor) {
        statusLabel.text = text
        iconView.image = UIImage(systemName: systemImage)
        iconView.tintColor = tint
        statusLabel.textColor = tint
    }

    // MARK: - Capture

    private func capture(_ url: URL) {
        // Always stash locally so the main app can pick it up (queue, not single overwrite).
        SharedURLStore.enqueuePendingURL(url)

        // Best-effort server ingest when the user has a JWT in the App Group.
        if let jwt = SharedURLStore.loadUserToken() {
            Task {
                do {
                    _ = try await ShareIngestService.ingest(
                        jwt: jwt,
                        sourceURL: url.absoluteString,
                        categoryId: nil
                    )
                } catch {
                    // Local queue still has it — main app will retry.
                }
                await MainActor.run { self.succeedAndClose() }
            }
        } else {
            succeedAndClose()
        }
    }

    private func succeedAndClose() {
        setStatus("Saved to Playbook ✓", systemImage: "checkmark.circle.fill",
                  tint: UIColor(red: 0.18, green: 0.72, blue: 0.42, alpha: 1))
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func failAndClose(_ message: String) {
        setStatus(message, systemImage: "exclamationmark.triangle.fill",
                  tint: UIColor(red: 1, green: 0.55, blue: 0.2, alpha: 1))
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    // MARK: - URL extraction

    private func extractSharedURL(completion: @escaping (URL?) -> Void) {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem else {
            completion(nil)
            return
        }

        let providers = item.attachments ?? []

        func finish(_ raw: String?) {
            guard let raw else { completion(nil); return }
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            // Prefer first http(s) URL embedded in the text (X/IG often wrap copy).
            if let match = trimmed.range(of: #"https?://[^\s<>\"']+"#, options: .regularExpression) {
                var candidate = String(trimmed[match])
                while let last = candidate.last, ".,);]\"'".contains(last) {
                    candidate.removeLast()
                }
                completion(URL(string: candidate))
                return
            }
            completion(URL(string: trimmed))
        }

        let typeOrder = [
            UTType.url.identifier,
            "public.url",
            UTType.plainText.identifier,
            "public.text",
            UTType.propertyList.identifier,
        ]

        func tryProvider(_ index: Int) {
            guard index < providers.count else {
                completion(nil)
                return
            }
            let provider = providers[index]
            func next() { tryProvider(index + 1) }

            for typeId in typeOrder where provider.hasItemConformingToTypeIdentifier(typeId) {
                provider.loadItem(forTypeIdentifier: typeId, options: nil) { value, _ in
                    if let url = value as? URL {
                        completion(url)
                        return
                    }
                    if let str = value as? String {
                        finish(str)
                        return
                    }
                    if let data = value as? Data, let str = String(data: data, encoding: .utf8) {
                        finish(str)
                        return
                    }
                    if let dict = value as? [String: Any] {
                        // Safari / some apps wrap the URL in a property list.
                        if let payload = dict[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any] {
                            let raw = (payload["URL"] as? String) ?? (payload["url"] as? String)
                            if let raw {
                                finish(raw)
                                return
                            }
                        }
                    }
                    next()
                }
                return
            }
            next()
        }

        tryProvider(0)
    }
}
