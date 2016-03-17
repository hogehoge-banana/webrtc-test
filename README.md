 WebRTCやってみる
========

# 目的

[https://html5experts.jp/mganeko/5438/](https://html5experts.jp/mganeko/5438/)参考にGoで実装しなおしながら、goの習得とWebRTCの理解を深める。

# Assumption

## local環境

- OS X Yosemite
- homebrewでgo install済み(なので最新ではない1.5を使用)
- 同じくhomebrewでdirenv install済み

## Proxy

- WebRTCがセキュア通信じゃないと動作しない制約があるのでローカルのnginxでオレオレ証明証で動作させる。
- ローカルマシンはいろいろあってポートは10443使用する。
- goで実行するサーバーは8092ポートを使用する

## direnv使う

goは環境変数`GOPATH`に依存関係なんでもぶち込んでくれる。
もともとビルド処理のために開発された言語なので単体で動くように設計されていて、ビルド設定ファイルとかは使用しない設計らしい。
複数プロジェクト開発するとき迷惑というか不安になるのでdirenvでプロジェクトごとに切り替える
.envrcもコミットしてるので詳細はそっち参照

# Setup

## nginx

```
ln -s ./nginx.conf /usr/local/etc/nginx/servers/wrtc
sudo nginx -s stop
sudo nginx
```

# Run

```
cd back
go run server.go
```
