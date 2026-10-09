import SwiftUI
import AVKit

/// Muted looping autoplay — no system play button / controls chrome.
struct LoopingVideoPlayer: View {
    let url: URL
    var isMuted: Bool = true

    var body: some View {
        AutoplayPlayerLayer(url: url, isMuted: isMuted)
            .accessibilityLabel("Play clip")
    }
}

private struct AutoplayPlayerLayer: UIViewRepresentable {
    let url: URL
    var isMuted: Bool = true

    func makeUIView(context: Context) -> PlayerContainerView {
        let view = PlayerContainerView()
        view.backgroundColor = .black
        view.configure(url: url, muted: isMuted)
        return view
    }

    func updateUIView(_ uiView: PlayerContainerView, context: Context) {
        uiView.configure(url: url, muted: isMuted)
    }

    static func dismantleUIView(_ uiView: PlayerContainerView, coordinator: ()) {
        uiView.tearDown()
    }
}

final class PlayerContainerView: UIView {
    private var player: AVQueuePlayer?
    private var looper: AVPlayerLooper?
    private var playerLayer: AVPlayerLayer?
    private var currentURL: URL?

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = bounds
    }

    func configure(url: URL, muted: Bool) {
        if currentURL == url, player != nil {
            player?.isMuted = muted
            if player?.timeControlStatus != .playing {
                player?.play()
            }
            return
        }
        tearDown()
        currentURL = url

        let item = AVPlayerItem(url: url)
        let queue = AVQueuePlayer(playerItem: item)
        queue.isMuted = muted
        queue.actionAtItemEnd = .none

        let layer = AVPlayerLayer(player: queue)
        layer.videoGravity = .resizeAspectFill
        layer.frame = bounds
        self.layer.addSublayer(layer)

        looper = AVPlayerLooper(player: queue, templateItem: item)
        player = queue
        playerLayer = layer
        queue.play()
    }

    func tearDown() {
        player?.pause()
        playerLayer?.removeFromSuperlayer()
        player = nil
        looper = nil
        playerLayer = nil
        currentURL = nil
    }
}

#Preview {
    LoopingVideoPlayer(url: URL(string: "https://example.com/sample.mp4")!)
        .frame(height: 400)
}
