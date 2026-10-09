# Optional Bash completion. Source this file after installing undominated-check.
_undominated_check_complete() {
  local current="${COMP_WORDS[COMP_CWORD]}" previous="${COMP_WORDS[COMP_CWORD-1]}"
  local candidate
  local words='--help --version --frontier --json --plain --color --exit-code --local --origin resources install'
  COMPREPLY=()
  case "$previous" in
    --project|--local) while IFS= read -r candidate; do COMPREPLY+=("$candidate"); done < <(compgen -d -- "$current"); return ;;
    --target) words='universal claude codex github cursor vscode undominated' ;;
    resources) words='list inspect install --help' ;;
    install|inspect)
      # Resource discovery reads the installed bundle; it makes no HTTP request.
      words="$(command "${COMP_WORDS[0]}" resources list 2>/dev/null | cut -f1)"
      ;;
    *)
      if [[ "${COMP_WORDS[1]}" == install || "${COMP_WORDS[1]}" == resources ]]; then
        words='--project --global --interactive --target --dry-run --json --help'
      fi
      ;;
  esac
  while IFS= read -r candidate; do COMPREPLY+=("$candidate"); done < <(compgen -W "$words" -- "$current")
}
complete -o filenames -o default -F _undominated_check_complete undominated-check
