 WebRTCやってみる
========

# 目的

[https://html5experts.jp/mganeko/5438/]参考にGoで実装しなおしながら、
goの習得とWebRTCの理解を深める。
goは公式ドキュメントがしっかりしてるしwebに情報がありふれてるので、
Goに関する細かいことは書かない。

# Setup

## Assumption
OS X Yosemite
homebrewでgo install済み(なので最新ではない1.5を使用)
同じくhomebrewでdirenv install済み

### Proxy
WebRTCがセキュア通信じゃないと動作しない。ローカルのnginxでオレオレ証明証で動作させる。
ローカルマシンはいろいろあってポートは10443使用する。
goで実行するサーバーは8092ポートを使用する

### direnv使う
goはもともとビルド処理のために開発された言語。
なので単体で動くように設計されていて、go用のビルド設定ファイルとかは使用しない設計
goは環境変数GOPATHに依存関係なんでもぶち込んでくれる。
複数プロジェクト開発するとき迷惑なのでdirenvでプロジェクトごとに切り替える
.envrcもコミットしてるので詳細はそっち参照


## nginx

ln -s ./nginx.conf /usr/local/etc/nginx/servers/wrtc
sudo nginx -s stop
sudo nginx

# run
cd back
go run server.go



# 実装メモ

go でスレッド作れる
defer で例外をスレッドの中に閉じ込められる。

エラー処理はc言語っぽい
