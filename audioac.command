#!/bin/bash
DIR=$(dirname "$(realpath "$0")")

$DIR/dist/server_app $DIR
