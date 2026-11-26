"""tests/unit/i18n/test_errors.py"""

from __future__ import annotations

import json
import re
from pathlib import Path
from string import Formatter

import pytest

from octop.i18n import error_message
from octop.infra.errors import ErrorCode, OctopError
from octop.infra.utils.locale import resolve_request_locale


def test_every_error_code_has_i18n_entry():
    for code in ErrorCode:
        for locale in ("en", "zh", "ru", "vi"):
            assert error_message(code.value, locale)


def test_error_message_zh():
    assert "名称" in error_message("AGENT_NAME_TAKEN", "zh")


def test_octop_error_localized_factory():
    err = OctopError.localized(ErrorCode.FORBIDDEN, "zh")
    assert err.code is ErrorCode.FORBIDDEN
    assert err.message == "没有权限。"


def test_octop_error_to_envelope_with_locale():
    err = OctopError(ErrorCode.AGENT_NAME_TAKEN, "agent name 'x' already in use")
    envelope = err.to_envelope(locale="zh")
    assert envelope["error"]["code"] == "AGENT_NAME_TAKEN"
    assert envelope["error"]["message"] == "该名称已被使用，请换一个名称。"


def test_resolve_request_locale_from_accept_language():
    class _Headers:
        def get(self, key: str) -> str | None:
            if key.lower() == "accept-language":
                return "zh-CN,en;q=0.9"
            return None

    class _Req:
        headers = _Headers()

    assert resolve_request_locale(_Req()) == "zh"


def test_dashboard_api_errors_match_backend():
    repo = Path(__file__).resolve().parents[3]
    dash_en = json.loads((repo / "dashboard/src/locales/en.json").read_text(encoding="utf-8"))
    backend_en = json.loads((repo / "src/octop/i18n/en.json").read_text(encoding="utf-8"))
    dash_codes = set(dash_en["apiErrors"].keys())
    backend_codes = set(backend_en["errors"].keys())
    assert dash_codes == backend_codes == {c.value for c in ErrorCode}


# i18next uses ``{{name}}``; a lone ``{name}`` is left uninterpolated in the UI.
_DASHBOARD_SINGLE_BRACE = re.compile(r"(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})")


def test_dashboard_api_errors_use_i18next_placeholders():
    repo = Path(__file__).resolve().parents[3]
    for locale in ("en", "zh"):
        data = json.loads(
            (repo / f"dashboard/src/locales/{locale}.json").read_text(encoding="utf-8")
        )
        for code, msg in data["apiErrors"].items():
            found = _DASHBOARD_SINGLE_BRACE.findall(msg)
            assert not found, (
                f"{locale} apiErrors.{code} uses Python-style {{{', '.join(found)}}} — "
                "dashboard i18next needs {{name}} double braces"
            )


def test_login_locked_interpolates_minutes():
    assert "15" in error_message("LOGIN_LOCKED", "zh", minutes=15)
    assert "minutes" not in error_message("LOGIN_LOCKED", "zh", minutes=15).lower()
    assert "{minutes}" not in error_message("LOGIN_LOCKED", "en", minutes=15)


def test_knowledge_doc_too_large_interpolates_max_mb():
    assert "100" in error_message("KNOWLEDGE_DOC_TOO_LARGE", "zh", max_mb=100)
    assert "{max_mb}" not in error_message("KNOWLEDGE_DOC_TOO_LARGE", "en", max_mb=100)


def test_localized_message_falls_back_when_key_missing(monkeypatch: pytest.MonkeyPatch):
    err = OctopError(ErrorCode.AUTH_FAILED, "custom detail")
    monkeypatch.setattr(
        "octop.infra.errors.i18n_error_message",
        lambda *_a, **_k: (_ for _ in ()).throw(KeyError("errors.X")),
    )
    assert err.localized_message("zh") == "custom detail"


def test_config_file_corrupt_interpolates_path_and_detail():
    kwargs = {"path": "~/.octop/config.json", "detail": "line 3, column 1"}
    assert "~/.octop/config.json" in error_message("CONFIG_FILE_CORRUPT", "en", **kwargs)
    assert "line 3, column 1" in error_message("CONFIG_FILE_CORRUPT", "zh", **kwargs)
    for locale in ("en", "zh"):
        msg = error_message("CONFIG_FILE_CORRUPT", locale, **kwargs)
        assert "{path}" not in msg and "{detail}" not in msg


def _flatten_i18n(node: dict, prefix: str = "") -> dict[str, str]:
    result: dict[str, str] = {}
    for key, value in node.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(_flatten_i18n(value, path))
        elif isinstance(value, str):
            result[path] = value
    return result


def _format_fields(message: str) -> set[str]:
    return {
        field_name
        for _literal, field_name, _format_spec, _conversion in Formatter().parse(message)
        if field_name is not None
    }


@pytest.mark.parametrize("locale", ["ru", "vi"])
def test_backend_error_and_stream_locales_are_complete(locale: str) -> None:
    repo = Path(__file__).resolve().parents[3]
    source = json.loads((repo / "src/octop/i18n/en.json").read_text(encoding="utf-8"))
    translated = json.loads((repo / f"src/octop/i18n/{locale}.json").read_text(encoding="utf-8"))
    for group in ("errors", "stream_errors"):
        expected = _flatten_i18n(source[group])
        actual = _flatten_i18n(translated.get(group, {}))
        assert set(actual) == set(expected)
        for key, english in expected.items():
            assert _format_fields(actual[key]) == _format_fields(english), (
                f"{locale}.{group}.{key} changed format fields"
            )


def test_bridge_display_name_interpolates_name():
    for locale in ("en", "ru", "vi"):
        message = error_message("BRIDGE_DISPLAY_NAME_TAKEN", locale, name="Octop peer")
        assert "Octop peer" in message
        assert "{name}" not in message
