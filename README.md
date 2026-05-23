# AXT-AyaKoto/axt-arcane-bundler

綾坂ことがAyaExpTech名義で制作しているTypeScriptライブラリ「AyaExpTech Arcane」を適切にコピペするためのツールです。

## License

2026- (c) Ayasaka-Koto.  
This is released under [the MIT License](./LICENSE).

## How to Use

Denoを用意したうえでこのリポジトリをクローンし、リポジトリルートで以下を実行します。

```sh
deno run ./exec.ts --allow-net --allow-write --allow-run
```

上記コマンドを実行すると、コピペのためのウィザードがCLIとして起動します。
ウィザード内で問われる質問は以下のとおりです。

1. `version: ` (短文自由入力)
    - どのバージョンのAyaExpTech Arcaneからコピペするかを指定します。
    - `1.0.0`のように、`v`などはつけずにバージョン番号を入力します。
    - 入力せず次に進むこともできます。この場合は最新の安定リリースバージョンが参照されます。
2. `imports: ` (チェックボックス 複数選択可)
    - AyaExpTech Arcaneが提供しているモジュール・クラスのうち、どれをコピペするかを指定します。
    - 選択肢は以下のとおりです。
        - `BinaryHeap`
        - `BinaryHeapLite`
        - `BinarySearch`
        - `Combination`
        - `Deque`
        - `DisjointSet`
        - `ExtendedMath`
        - `Iteration`
        - `LazySegmentTree`
        - `LinearSieve`
        - `MaxFlow`
        - `ModOps`
        - `SegmentTree`
        - `StringOperations `
        - `Treap`
        - `UniqueID`
        - `Vector2D`
    - 複数選択も可能です。また、1つ以上選択する必要があります。

上記のすべての質問に回答し終わると、クリップボードに(2)で選択したすべてのモジュールのコードがコピーされ、実行が終了します。

> [!NOTE]
> (2)で選択したモジュール・クラスに、他のモジュール・クラスに依存するものが含まれる場合、依存先のモジュール・クラスも含めたコードがコピーされます。
>
> 例: `ModOps`をimportすると、選択されていなくても自動的に`ExtendedMath`のコードもコピーされます。

なお、以下のような場合はクリップボードへのコピーは行われず、エラーメッセージを出したうえで実行が異常終了します。

- (1)で指定したバージョンがAyaExpTech Arcaneに存在しない
- 指定されたバージョンは存在するが、(2)で指定されたバージョンでは(まだ)存在しないモジュール・クラスを指定している
