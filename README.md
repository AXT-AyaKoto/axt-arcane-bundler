# AXT-AyaKoto/axt-arcane-bundler

綾坂ことがAyaExpTech名義で制作しているTypeScriptライブラリ「AyaExpTech Arcane」を適切にコピペするためのツールです。

> AyaExpTech Arcane
> - GitHub: https://github.com/AXT-Studio/Arcane
> - JSR: https://jsr.io/@ayaexptech/arcane

> このツール (axt-arcane-bundler)
> - JSR: https://jsr.io/@axt-ayakoto/axt-arcane-bundler

## License

2026- (c) Ayasaka-Koto.  
This is released under [the MIT License](./LICENSE).

## How to Use

### JSRから直接利用する (推奨)

事前にDenoをインストールしたうえで、以下のコマンドでウィザードを起動します。

```sh
deno run -A jsr:@axt-ayakoto/axt-arcane-bundler
```

> [!TIP]
> 実行バージョンを固定したい場合は、以下のコマンドを使用することができます。
> ```sh
> deno run -A jsr:@axt-ayakoto/axt-arcane-bundler@1.0.0
> ```

### リポジトリをクローンして利用する (開発用)

事前にDenoをインストールし、リポジトリをクローンしたうえで、以下のいずれかのコマンドでウィザードを起動します。

```sh
deno run ./exec.ts --allow-net --allow-read --allow-run --allow-env
```

```sh
deno task start
```

### ウィザードの使用方法

上記コマンドを実行すると、コピペのためのウィザードがCLIとして起動します。
ウィザード内で問われる質問は以下のとおりです。

1. `version: ` (短文自由入力)
    - どのバージョンの [AyaExpTech Arcane](https://github.com/AXT-Studio/Arcane)（[`jsr:@ayaexptech/arcane`](https://jsr.io/@ayaexptech/arcane)）からコピペするかを指定します。
    - `1.0.0-alpha.3` のように、`v` などはつけずにバージョン番号を入力します。
    - 入力せず次に進むこともできます。この場合は JSR 上の最新安定版（`latest`）を参照します。安定版が未公開のときは、公開済みバージョンのうち最も新しいものがヒントとして表示されます。
2. `imports: ` (チェックボックス 複数選択可)
    - AyaExpTech Arcane が提供しているモジュール・クラスのうち、どれをコピペするかを指定します。
    - 選択肢は、指定（または解決）したバージョンの `mod.ts` から **自動取得** され、辞書順に表示されます。
    - 複数選択も可能です。また、1つ以上選択する必要があります。

上記のすべての質問に回答し終わると、クリップボードに (2) で選択した export の TypeScript ソース（依存分を含む）がコピーされ、実行が終了します。出力はコピペ先に貼り付ける想定のため、`export` キーワードは付きません（JSDoc は保持されます）。

> [!NOTE]
> (2) で選択したモジュール・クラスに、他のモジュール・クラスに依存するものが含まれる場合、依存先のコードも自動的に含まれます（例: `ModOps` を選ぶと `ExtendedMath` も含まれる）。
>
> 同一ソースファイルに複数の export がある場合、選択した export のみが含まれます（例: `BinaryHeap` のみを選んだとき `BinaryHeapLite` は含まれません）。

なお、以下のような場合はクリップボードへのコピーは行われず、エラーメッセージを出したうえで実行が異常終了します。

- (1) で指定したバージョンが AyaExpTech Arcane に存在しない

## Building standalone binaries

Deno が入っている環境で、macOS (Apple Silicon)・Windows・Linux 向けのバイナリをまとめてビルドできます。

```sh
deno task compile
```

成果物は `dist/` に出力されます。

| ファイル | 対象 |
|----------|------|
| `dist/axt-arcane-bundler-aarch64-apple-darwin` | macOS (Apple Silicon) |
| `dist/axt-arcane-bundler-x86_64-pc-windows-msvc.exe` | Windows (x86_64) |
| `dist/axt-arcane-bundler-x86_64-unknown-linux-gnu` | Linux (x86_64) |

実行例:

```sh
# macOS
./dist/axt-arcane-bundler-aarch64-apple-darwin

# Linux
./dist/axt-arcane-bundler-x86_64-unknown-linux-gnu

# Windows (PowerShell)
.\dist\axt-arcane-bundler-x86_64-pc-windows-msvc.exe
```

ビルド時に `--allow-net`・`--allow-read`・`--allow-run`・`--allow-env` がバイナリへ埋め込まれるため、実行時に権限フラグは不要です。実行時も JSR からソースを取得するため、ネットワーク接続が必要です。

テストは `deno task test` で実行できます。

クリップボード連携: macOS は `pbcopy`、Windows は `clip`、Linux は `wl-copy` / `xclip` / `xsel`（いずれかが PATH にある場合）を使用します。

## Releasing

JSR への公開は GitHub Actions で行います。初回のみ、[JSR のパッケージ設定](https://jsr.io/@axt-ayakoto/axt-arcane-bundler/settings) でこの GitHub リポジトリを Link してください。

1. 変更を `main` に merge する
2. GitHub で Release を作成し **新規** の `vX.Y.Z` タグを付ける、または `git tag vX.Y.Z && git push origin vX.Y.Z` する
3. [Publish to JSR](.github/workflows/publish.yml) ワークフローが走り、[JSR](https://jsr.io/@axt-ayakoto/axt-arcane-bundler) に反映される

リリース前の手動確認: GitHub Actions → **Publish to JSR** → **Run workflow** → `tag_name` に例 `v0.1.0`、`dry_run` をオンにして実行する。

リポジトリ上の [`jsr.json`](jsr.json) の `version` は常に `0.0.0` のままです。CI がタグから semver を読み取り、publish 時だけ差し替えます。
