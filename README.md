# AXT-AyaKoto/axt-arcane-bundler

綾坂ことがAyaExpTech名義で制作しているTypeScriptライブラリ「AyaExpTech Arcane」を適切にコピペするためのツールです。

> AyaExpTech Arcane
>
> - GitHub: https://github.com/AXT-Studio/Arcane
> - JSR: https://jsr.io/@ayaexptech/arcane

## License

2026- (c) Ayasaka-Koto.  
This is released under [the MIT License](./LICENSE).

## How to Use

### GitHub Releasesから利用する (推奨)

Node.js 22.13以降の22系、または24以降をインストールしたうえで、以下のコマンドでウィザードを起動します。`v1.0.0`・`1.0.0` は使用するリリースに置き換えてください。

```sh
npx --yes https://github.com/AXT-AyaKoto/axt-arcane-bundler/releases/download/v1.0.0/axt-arcane-bundler-1.0.0.tgz
```

Bunの現行安定版でも実行できます。`--bun` を指定すると、Node.jsではなくBunで実行します。

```sh
bunx --bun axt-arcane-bundler@https://github.com/AXT-AyaKoto/axt-arcane-bundler/releases/download/v1.0.0/axt-arcane-bundler-1.0.0.tgz
```

Bun 1.4.3ではtgzのURLだけを渡す形式がエラーになるため、`axt-arcane-bundler@URL` と指定します。

配布するtgzにはビルド済みのES Moduleと依存ライブラリが含まれています。Denoのインストールは不要です。ただし、実行時にArcaneのソースをJSRから取得するため、ネットワーク接続は必要です。

### リポジトリをクローンして利用する (開発用)

```sh
npm ci
npm start
```

Bunで実行する場合も、依存のインストールには共通の`package-lock.json`を使います。

```sh
npm ci
bun run exec.ts
```

### ウィザードの使用方法

上記コマンドを実行すると、コピペのためのウィザードがCLIとして起動します。
ウィザード内で問われる質問は以下のとおりです。

1. `version:` (検索付き単一選択)
    - どのバージョンの [AyaExpTech Arcane](https://github.com/AXT-Studio/Arcane)（[`jsr:@ayaexptech/arcane`](https://jsr.io/@ayaexptech/arcane)）からコピペするかを指定します。
    - JSRからプレリリースを含む公開済みバージョンを取得し、SemVerで新しい順に表示します。文字を入力するとバージョン名で絞り込めます。
    - 安定版がある場合、先頭の `Latest stable` がデフォルトです。安定版がない場合は、プレリリースを含む最新バージョンがデフォルトです。
    - `Latest stable` を選ぶと生成コメントのパッケージ指定にバージョンを付けず、個別のバージョンを選ぶと固定します。取得に使ったバージョンはどちらの場合もコメントに記録します。
2. `imports:` (チェックボックス 複数選択可)
    - AyaExpTech Arcaneが提供しているモジュール・クラスのうち、どれをコピペするかを指定します。
    - 選択肢は、選択したバージョンの `mod.ts` から **自動取得** され、辞書順に表示されます。
    - スペースキーで選択を切り替え、Enterで確定します。検索機能はありません。
    - 何も選択せずに確定した場合、クリップボードを変更せず正常終了します。
3. `output:` (単一選択)
    - `TypeScript` (デフォルト): 従来どおりTypeScriptソースをコピーします。
    - `JavaScript (strip types)`: Sucraseで型を除去してコピーします。minifyや古いJavaScript実行環境向けの構文変換は行いません。

上記のすべての質問に回答し終わると、クリップボードに (2) で選択した export のソース（依存分を含む）がコピーされ、実行が終了します。出力はコピペ先に貼り付ける想定のため、`export` キーワードは付きません（JSDoc は保持されます）。

> [!NOTE]
> (2) で選択したモジュール・クラスに、他のモジュール・クラスに依存するものが含まれる場合、依存先のコードも自動的に含まれます（例: `ModOps` を選ぶと `ExtendedMath` も含まれる）。
>
> 同一ソースファイルに複数の export がある場合、選択した export のみが含まれます（例: `BinaryHeap` のみを選んだとき `BinaryHeapLite` は含まれません）。依存先のファイルでも、実際に参照されている export だけが残ります（例: `TwoSAT` を選んでも `UndirectedGraph` は含まれません）。

JSRから必要な情報やソースを取得できない場合はエラーで終了します。export一覧の取得に失敗した場合は、従来どおり組み込みの候補一覧を表示します。Ctrl+Cで質問を中断できます。

## Development

```sh
npm run check        # 型チェック
npm test             # Node.jsでテスト
npm run test:bun     # Bunで同じテスト
npm run build        # dist/cli.js (ES Module) を生成
npm pack             # axt-arcane-bundler-0.0.0.tgz を生成 (ビルドも自動実行)
```

配布物の動作確認は、Linux上でNode.jsとBunを用意して以下を実行します。JSRとクリップボードはテスト用のものを使い、実際のクリップボードは変更しません。

```sh
npm run test:package -- ./axt-arcane-bundler-0.0.0.tgz
```

## Building standalone binaries

Bunと開発用の依存が入っている環境で、macOS (Apple Silicon)・Windows・Linux 向けのバイナリをまとめてビルドできます。

```sh
npm run compile
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
