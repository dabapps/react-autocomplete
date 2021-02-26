#!/bin/sh -e

prettier --check '**/*.{ts,tsx,js,jsx,html,css,md,mk,json}'
eslint '**/*.{ts,tsx,js,jsx,html,css,md,mk,json}'
