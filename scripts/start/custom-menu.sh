#!/bin/sh -e

mkdir -p examples/__build__
watchify examples/custom-menu/app.js -t babelify -v -o examples/__build__/custom-menu.js
