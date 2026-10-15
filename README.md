# AXT-AyaKoto/axt-arcane-bundler

綾坂ことがAyaExpTech名義で制作しているTypeScriptライブラリ「AyaExpTech Arcane」を適切にコピペするためのツールです。

> AyaExpTech Arcane
>
> - GitHub: https://github.com/AXT-Studio/Arcane
> - JSR: https://jsr.io/@ayaexptech/arcane

## License

copyright (c) 2026- Ayasaka-Koto.
This is released under [the MIT License](./LICENSE).

> [!NOTE]
> このツールは、そのほとんどがAIによって実装された、いわゆるVibe-Codingプロダクトです。  
> AIへの指示を行った私(綾坂こと)がDogfoodingを行っているためある程度品質については保証しますが、Vibe-Codingによるプロダクトであることには留意してください。

## How to Use

ウィザードの使用方法自体は「従うだけ」なので割愛します。
TypeScriptでコピーする他に、JavaScriptにType Strippingしてコピーすることもできます。

実行のためには以下のいずれかが必要です。

- Node.js (22.13以降) と pnpm
- Bun

また、実行時はネットワーク接続が必要です。

### GitHub Releasesから利用

- Node.js・pnpmの場合: `pnpm dlx https://github.com/AXT-AyaKoto/axt-arcane-bundler/releases/download/v2.0.0/axt-arcane-bundler-2.0.0.tgz`
- Bunの場合: `bunx --bun axt-arcane-bundler@https://github.com/AXT-AyaKoto/axt-arcane-bundler/releases/download/v2.0.0/axt-arcane-bundler-2.0.0.tgz`

バージョン番号(URL内2箇所)は適宜置き換えてください。

### リポジトリをクローンして利用 (開発用)

```sh
pnpm install
pnpm run start
```

---

## Development

```sh
pnpm run check        # 型チェック
pnpm test             # Node.jsでテスト
pnpm run test:bun     # Bunで同じテスト
pnpm run build        # dist/cli.js (ES Module) を生成
pnpm pack             # axt-arcane-bundler-0.0.0.tgz を生成 (ビルドも自動実行)
```

配布物の動作確認は、Linux上でNode.jsとBunを用意して以下を実行します。JSRとクリップボードはテスト用のものを使い、実際のクリップボードは変更しません。

```sh
pnpm run test:package -- ./axt-arcane-bundler-0.0.0.tgz
```

## Building standalone binaries

Bunと開発用の依存が入っている環境で、macOS (Apple Silicon)・Windows・Linux 向けのバイナリをまとめてビルドできます。

```sh
pnpm run compile
```

成果物は `dist/` に出力されます。

| ファイル                                             | 対象                  |
| ---------------------------------------------------- | --------------------- |
| `dist/axt-arcane-bundler-aarch64-apple-darwin`       | macOS (Apple Silicon) |
| `dist/axt-arcane-bundler-x86_64-pc-windows-msvc.exe` | Windows (x86_64)      |
| `dist/axt-arcane-bundler-x86_64-unknown-linux-gnu`   | Linux (x86_64)        |

実行例:

```sh
# macOS
./dist/axt-arcane-bundler-aarch64-apple-darwin

# Linux
./dist/axt-arcane-bundler-x86_64-unknown-linux-gnu

# Windows (PowerShell)
.\dist\axt-arcane-bundler-x86_64-pc-windows-msvc.exe
```

Bunの `build --compile` で生成します。実行時にNode.js・Bunのインストールや権限フラグは不要ですが、JSRへのネットワーク接続は必要です。単体バイナリは手動ビルド用で、Releaseに自動添付するのはtgzです。

クリップボード連携: macOS は `pbcopy`、Windows は `clip`、Linux は `wl-copy` / `xclip` / `xsel`（いずれかが PATH にある場合）を使用します。

## Releasing

GitHub Releasesへのtgzの添付はGitHub Actionsで行います。

1. 変更を `main` にmergeする
2. GitHubでReleaseを作成し、対象コミットに `vX.Y.Z` または `vX.Y.Z-alpha.N` などのタグを付けて **Publish release** を押す
3. [Build Release package](.github/workflows/publish.yml) がタグのコミットをcheckoutし、型チェック・テスト・ビルド・梱包・Node.js/Bunでの配布物検証を行う
4. 同じReleaseのAssetsに `axt-arcane-bundler-X.Y.Z.tgz` が添付される

下書きの保存やタグのpushだけでは起動しません。プレリリースの公開も対象です。Release公開からAsset添付まではビルド時間がかかります。

手動確認はGitHub Actions → **Build Release package** → **Run workflow** から行えます。`tag_name` に既存のタグを指定し、`dry_run` をオンにすると、Releaseには添付せずActionsのArtifactにtgzを保存します。オフにすると、指定した既存Releaseに添付します。再実行時は同名Assetを置き換えます。

リポジトリ上の `package.json`・`package-lock.json` のバージョンは `0.0.0` のままです。CIがタグからSemVerを読み取り、ビルド時だけ差し替えます。npmレジストリや、このツールの旧JSRパッケージには公開しません。Arcaneの取得元は引き続きJSRです。
