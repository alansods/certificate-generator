import { computed, effect, linkedSignal, Signal } from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { toProblemDetail } from "../../../core/http/problem-detail";
import { CERTIFICATE_CODE_PATTERN } from "./certificate-code";
import { VerificationApi } from "./verification.api";

export type VerificationErrorKind = "not-found" | "rate-limited" | "generic";

/**
 * The lookup state both verification pages need: a field kept in step with wherever the page
 * reads its code from, the shape check that keeps a typo from reaching the API, the request, and
 * the outcome. The pages differ only in where the code lives in the URL and where submitting
 * navigates, so that is all they are left holding.
 */
export function createVerificationLookup(options: {
  api: VerificationApi;
  /** The code as the URL currently has it, already whatever case it arrived in. */
  routeCode: Signal<string>;
}) {
  const { api, routeCode } = options;

  const code = computed(() => routeCode().trim().toUpperCase());

  /** A code in the URL that cannot be a code is a typo, not a missing certificate. */
  const urlCodeMalformed = computed(
    () => code().length > 0 && !CERTIFICATE_CODE_PATTERN.test(code()),
  );

  const control = new FormControl("", { nonNullable: true });
  const typed = toSignal(control.valueChanges, { initialValue: "" });

  /** Cleared as soon as the visitor edits: reporting the field invalid while they type a correct
   * code is reporting invalid for input that is not. */
  const showFormatError = linkedSignal({
    source: () => ({ code: code(), typed: typed() }),
    computation: () => false,
  });

  const resource = rxResource({
    // Nothing to look up until a well-formed code is in the URL: an empty or malformed one must
    // not reach the API at all.
    params: () => (code() && !urlCodeMalformed() ? { code: code() } : undefined),
    stream: ({ params }) => api.verify(params.code),
  });

  // The field follows the URL, including back and forward between two codes. `emitEvent: false`
  // so following a link does not look like the visitor typing.
  effect(() => control.setValue(code(), { emitEvent: false }));

  const errorKind = computed<VerificationErrorKind | null>(() => {
    const error = resource.error();
    if (!error) {
      return null;
    }
    const status = toProblemDetail(error).status;
    if (status === 404) {
      return "not-found";
    }
    if (status === 429) {
      return "rate-limited";
    }
    return "generic";
  });

  return {
    code,
    control,
    urlCodeMalformed,
    showFormatError,
    invalid: computed(() => showFormatError() || urlCodeMalformed()),
    isLoading: resource.isLoading,
    errorKind,
    // `value` throws while the resource is in an error state, and the result card reads this
    // unconditionally rather than only inside the success branch.
    certificate: computed(() => (resource.hasValue() ? resource.value() : undefined)),
    reload: () => resource.reload(),
    /**
     * Validates the field. Returns the normalized code when it is well-formed and the page should
     * navigate, `null` when it was rejected or already on screen (in which case the lookup is
     * simply re-run, so the visitor is not left wondering whether the button worked).
     */
    submit(): string | null {
      const candidate = control.value.trim().toUpperCase();
      if (!CERTIFICATE_CODE_PATTERN.test(candidate)) {
        showFormatError.set(true);
        return null;
      }
      showFormatError.set(false);
      if (candidate === code()) {
        resource.reload();
        return null;
      }
      return candidate;
    },
  };
}
