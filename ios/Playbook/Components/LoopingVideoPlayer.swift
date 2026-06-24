import SwiftUI
import AVKit

struct LoopingVideoPlayer: View {
    let url: URL
    var isMuted: Bool = true

    @State private var player: AVQueuePlayer?
    @State private var looper: AVPlayerLooper?

    var body: some View {
        VideoPlayer(player: player)
            .onAppear { configurePlayer() }
            .onDisappear {
                player?.pause()
                player = nil
                looper = nil
            }
            .onChange(of: url) { _, _ in configurePlayer() }
            .accessibilityLabel("Play clip")
    }

    private func configurePlayer() {
        let item = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer(playerItem: item)
        queuePlayer.isMuted = isMuted
        queuePlayer.play()

        looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
        player = queuePlayer
    }
}

#Preview {
    LoopingVideoPlayer(url: URL(string: "https://example.com/sample.mp4")!)
        .frame(height: 400)
}
