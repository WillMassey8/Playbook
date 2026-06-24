import UIKit
import SwiftUI
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1)
        extractSharedURL { [weak self] url in
            DispatchQueue.main.async {
                guard let self else { return }
                if let url {
                    self.presentCategorizer(for: url)
                } else {
                    self.completeRequest()
                }
            }
        }
    }

    // MARK: - URL extraction

    private func extractSharedURL(completion: @escaping (URL?) -> Void) {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem else {
            completion(nil)
            return
        }

        let providers = item.attachments ?? []

        // Try typed URL first
        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                provider.loadItem(forTypeIdentifier: UTType.url.identifier) { value, _ in
                    completion(value as? URL)
                }
                return
            }
        }

        // Fall back to plain text (Twitter/X share sheet sends the URL as text)
        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { value, _ in
                    guard
                        let text = value as? String,
                        let url = URL(string: text.trimmingCharacters(in: .whitespacesAndNewlines)),
                        url.scheme?.hasPrefix("http") == true
                    else {
                        completion(nil)
                        return
                    }
                    completion(url)
                }
                return
            }
        }

        completion(nil)
    }

    // MARK: - Present SwiftUI categorizer

    private func presentCategorizer(for url: URL) {
        let swiftUIView = CategorizeShareView(
            sharedURL: url,
            onComplete: { [weak self] in self?.completeRequest() },
            onCancel:   { [weak self] in self?.cancelRequest()   },
            openMainApp: { [weak self] in
                guard let url = URL(string: "playbook://share") else { return }
                self?.extensionContext?.open(url, completionHandler: nil)
            }
        )

        let host = UIHostingController(rootView: swiftUIView)
        host.view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1)

        addChild(host)
        view.addSubview(host.view)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        host.didMove(toParent: self)
    }

    // MARK: - Extension lifecycle

    private func completeRequest() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    private func cancelRequest() {
        extensionContext?.cancelRequest(withError: NSError(
            domain: "com.playbook.shareextension",
            code: NSUserCancelledError
        ))
    }
}
