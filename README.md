# AXT-AyaKoto/axt-arcane-bundler

綾坂ことがAyaExpTech名義で制作しているTypeScriptライブラリ「AyaExpTech Arcane」を適切にコピペするためのツールです。

> AyaExpTech Arcane
> - GitHub: https://github.com/AXT-Studio/Arcane
> - JSR: https://jsr.io/@ayaexptech/arcane

## License

2026- (c) Ayasaka-Koto.  
This is released under [the MIT License](./LICENSE).

## How to Use

実行には以下のいずれかが必要です。また、実行時はネットワーク接続が必要です。

- Node.js (22.18以降) と pnpm
- Bun

### GitHubリポジトリから直接利用する (推奨)

以下のいずれかのコマンドでウィザードを起動します。

```sh
# Node.js + pnpm
pnpm dlx github:AXT-AyaKoto/axt-arcane-bundler
```

```sh
# Bun
bunx github:AXT-AyaKoto/axt-arcane-bundler
```

> [!TIP]
> 実行バージョンを固定したい場合は、末尾に `#` とタグ名を付けます。
> ```sh
> pnpm dlx github:AXT-AyaKoto/axt-arcane-bundler#v0.5.0-RC1
> bunx github:AXT-AyaKoto/axt-arcane-bundler#v0.5.0-RC1
> ```

> [!NOTE]
> `bunx` は、Node.js がインストールされている環境では Node.js で実行します。Bun だけで実行したい場合は `bunx --bun github:AXT-AyaKoto/axt-arcane-bundler` としてください。

### リポジトリをクローンして利用する (開発用)

リポジトリをクローンしたうえで、以下のコマンドでウィザードを起動します。

```sh
pnpm install
pnpm start      # Node.jsで実行
pnpm start:bun  # Bunで実行
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
    - スペースキーで選択し、Enterキーで確定します。複数選択も可能です。また、1つ以上選択する必要があります。
3. `language: ` (選択式)
    - コピーするコードの言語を `TypeScript`（デフォルト）と `JavaScript (type-stripped)` から選びます。
    - `JavaScript (type-stripped)` を選ぶと、[Sucrase](https://github.com/alangpierce/sucrase) で型注釈などの TypeScript 固有の構文だけを取り除いたコードがコピーされます（それ以外の構文は変換しません）。`type` / `interface` 宣言は JSDoc ごと取り除かれます。

上記のすべての質問に回答し終わると、クリップボードに (2) で選択した export のソース（依存分を含む）がコピーされ、実行が終了します。出力はコピペ先に貼り付ける想定のため、`export` キーワードは付きません（JSDoc は保持されます）。

> [!NOTE]
> (2) で選択したモジュール・クラスに、他のモジュール・クラスに依存するものが含まれる場合、依存先のコードも自動的に含まれます（例: `ModOps` を選ぶと `ExtendedMath` も含まれる）。
>
> 同一ソースファイルに複数の export がある場合、選択した export のみが含まれます（例: `BinaryHeap` のみを選んだとき `BinaryHeapLite` は含まれません）。依存先のファイルでも、実際に参照されている export だけが残ります（例: `TwoSAT` を選んでも `UndirectedGraph` は含まれません）。

なお、以下のような場合はクリップボードへのコピーは行われず、エラーメッセージを出したうえで実行が異常終了します。

- (1) で指定したバージョンが AyaExpTech Arcane に存在しない

クリップボード連携: macOS は `pbcopy`、Windows は `clip`、Linux は `wl-copy` / `xclip` / `xsel`（いずれかが PATH にある場合）を使用します。いずれも使えない場合は標準出力に書き出します。

## Development

```sh
pnpm check     # 型チェック
pnpm test      # Node.jsでテスト
pnpm test:bun  # Bunでテスト
```

ビルド工程はありません。`pnpm dlx` / `bunx` は GitHub 上のリポジトリをそのままインストールし、`package.json` の `bin` が指す [`bin/axt-arcane-bundler.js`](bin/axt-arcane-bundler.js) を実行します。このスクリプトは `src/cli.ts` を直接読み込みます。

- Bun は TypeScript をそのまま実行できるため、何もせずに読み込みます。
- Node.js は `node_modules` 配下のファイルの型除去 (Type Stripping) を行わないため、`module.registerHooks` で `src/` 内の `.ts` を TypeScript コンパイラ (`typescript` パッケージ、AST 解析用の依存を流用) で変換してから読み込みます。

> [!WARNING]
> `package.json` の `scripts` に `prepare`・`install`・`postinstall` などのライフサイクルスクリプトを追加しないでください。pnpm は GitHub 由来のパッケージがこれらを持っていると、セキュリティ上の理由で `pnpm dlx` の実行を拒否します。

## Releasing

npm レジストリや JSR には公開せず、GitHub リポジトリのタグをそのまま配布物として扱います。

1. 変更を `main` に merge する
2. `git tag vX.Y.Z && git push origin vX.Y.Z` する（または GitHub で Release を作成し、新規の `vX.Y.Z` タグを付ける）

タグを付けなくても、`main` に merge した時点で `pnpm dlx github:AXT-AyaKoto/axt-arcane-bundler`（タグ指定なし）の実行内容は更新されます。
