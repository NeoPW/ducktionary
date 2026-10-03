import { useNavigation } from "expo-router";
import { useHeaderHeight, usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { useConfirm } from "@/components/confirm-dialog";
import { Dropdown } from "@/components/dropdown";
import { ChipInput } from "@/components/form/chip-input";
import { ChoiceChips } from "@/components/form/choice-chips";
import { CoverPicker } from "@/components/form/cover-picker";
import { DateField } from "@/components/form/date-field";
import { RatingField } from "@/components/form/rating-field";
import { ScreenBackground } from "@/components/screen-background";
import { FieldShell, TextField } from "@/components/form/text-field";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { BookDraft } from "@/types";
import { ACQUISITIONS, FORMATS, isPriced } from "@/utils/book-attributes";
import { draftToForm, formToDraft, type BookFormErrors, type BookFormState } from "@/utils/book-form";
import { todayIso } from "@/utils/dates";
import { toError } from "@/utils/errors";

type BookFormProps = {
  initial: BookDraft;
  submitLabel: string;
  /**
   * Saves the draft. Resolve with the navigation to run afterwards (it runs once the
   * unsaved-changes guard is off), or undefined to stay on the form (e.g. the user cancelled).
   */
  onSubmit: (draft: BookDraft) => Promise<(() => void) | undefined>;
  categorySuggestions?: string[];
  /** Series already in the library, offered while typing a series name. */
  seriesSuggestions?: string[];
  /** Optional content above the form, e.g. a duplicate warning. */
  notice?: React.ReactNode;
};

export function BookForm({
  initial,
  submitLabel,
  onSubmit,
  categorySuggestions,
  seriesSuggestions = [],
  notice,
}: BookFormProps) {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const confirm = useConfirm();
  const [initialForm] = useState<BookFormState>(() => draftToForm(initial));
  const [form, setForm] = useState<BookFormState>(initialForm);
  const [errors, setErrors] = useState<BookFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const today = todayIso();

  // Ask before throwing away edits (back button, swipe, header back).
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  usePreventRemove(dirty && leave == null, ({ data }) => {
    confirm({
      title: "Discard changes?",
      message: "You have unsaved changes to this book. Leave without saving?",
      confirmText: "Discard",
      cancelText: "Keep editing",
      destructive: true,
    }).then((discard) => discard && navigation.dispatch(data.action));
  });

  // After a save, navigate only once the guard above has been switched off.
  useEffect(() => {
    leave?.();
  }, [leave]);

  const update = <K extends keyof BookFormState>(key: K, value: BookFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const result = formToDraft(form, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const next = await onSubmit(result.draft);
      if (next) setLeave(() => next);
    } catch (error) {
      setSaveError(toError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {notice}

        <View style={styles.hero}>
          <CoverPicker
            title={form.title || "New book"}
            coverUrl={form.coverUrl}
            originalUrl={initialForm.coverUrl}
            onChange={(coverUrl) => update("coverUrl", coverUrl)}
            width={84}
          />
          <View style={styles.heroText}>
            <AppText variant="heading" numberOfLines={3}>
              {form.title || "New book"}
            </AppText>
            {form.authors.length > 0 && (
              <AppText color="muted" numberOfLines={2}>
                {form.authors.join(", ")}
              </AppText>
            )}
          </View>
        </View>

        <TextField
          label="Title *"
          value={form.title}
          onChangeText={(text) => update("title", text)}
          error={errors.title}
          placeholder="The Hobbit"
          autoCapitalize="words"
        />
        <ChipInput
          label="Authors"
          values={form.authors}
          onChange={(authors) => update("authors", authors)}
          placeholder="Add an author and press enter"
        />
        <DateField
          label="Finished *"
          value={form.finishedAt}
          onChange={(date) => update("finishedAt", date)}
          minimumDate={form.startedAt}
          maximumDate={today}
          error={errors.finishedAt}
        />
        <DateField
          label="Started"
          value={form.startedAt}
          onChange={(date) => update("startedAt", date)}
          maximumDate={form.finishedAt ?? today}
          clearable
          error={errors.startedAt}
        />
        <RatingField value={form.rating} onChange={(rating) => update("rating", rating)} />
        <ChipInput
          label="Categories"
          values={form.categories}
          onChange={(categories) => update("categories", categories)}
          placeholder="Add a category and press enter"
          suggestions={categorySuggestions}
        />
        <SeriesPicker
          value={form.series}
          names={seriesSuggestions}
          onChange={(name) => update("series", name)}
          position={form.seriesPosition}
          onPositionChange={(text) => update("seriesPosition", text)}
          positionError={errors.seriesPosition}
        />
        <TextField
          label="Comments & notes"
          value={form.comment}
          onChangeText={(text) => update("comment", text)}
          placeholder="What did you think? Favourite quotes?"
          multiline
        />
        <ChoiceChips
          label="Format"
          options={FORMATS}
          value={form.format}
          onChange={(format) => update("format", format)}
        />
        <ChoiceChips
          label="How did you get it?"
          options={ACQUISITIONS}
          value={form.acquisition}
          onChange={(acquisition) => update("acquisition", acquisition)}
        />
        {isPriced(form.acquisition) && (
          <TextField
            label="Price (€)"
            value={form.price}
            onChangeText={(text) => update("price", text)}
            error={errors.price}
            keyboardType="decimal-pad"
            placeholder="12,99"
          />
        )}
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Pages"
              value={form.pages}
              onChangeText={(text) => update("pages", text)}
              error={errors.pages}
              keyboardType="number-pad"
              placeholder="320"
            />
          </View>
          <View style={styles.isbn}>
            <TextField
              label="ISBN"
              value={form.isbn}
              onChangeText={(text) => update("isbn", text)}
              error={errors.isbn}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="978…"
            />
          </View>
        </View>

        {saveError ? (
          <AppText color="danger" style={styles.center}>
            Couldn&apos;t save: {saveError}
          </AppText>
        ) : null}
        <Button title={saving ? "Saving…" : submitLabel} onPress={submit} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NO_SERIES = "";
const NEW_SERIES = "__new";

/**
 * Series: a dropdown of the series already in the library, plus "New series…" which asks for a name. The number
 * in the series sits next to it.
 */
function SeriesPicker({
  value,
  names,
  onChange,
  position,
  onPositionChange,
  positionError,
}: {
  value: string;
  names: string[];
  onChange: (name: string) => void;
  position: string;
  onPositionChange: (text: string) => void;
  positionError?: string;
}) {
  const [creating, setCreating] = useState(false);
  const known = names.find((name) => name.toLowerCase() === value.trim().toLowerCase());
  // A name that isn't in the list (yet) is being typed as a new series.
  const typingNew = creating || (value.trim() !== "" && !known);
  const options = [
    { value: NO_SERIES, label: "No series" },
    ...names.map((name) => ({ value: name, label: name })),
    { value: NEW_SERIES, label: "New series…" },
  ];

  return (
    <View style={styles.seriesBlock}>
      <View style={styles.row}>
        <View style={styles.isbn}>
          <FieldShell label="Series">
            <Dropdown
              compact
              accessibilityLabel="Series"
              value={typingNew ? NEW_SERIES : (known ?? NO_SERIES)}
              options={options}
              onChange={(picked) => {
                setCreating(picked === NEW_SERIES);
                onChange(picked === NEW_SERIES ? "" : picked);
              }}
            />
          </FieldShell>
        </View>
        <View style={styles.flex}>
          <TextField
            label="No."
            value={position}
            onChangeText={onPositionChange}
            error={positionError}
            keyboardType="decimal-pad"
            placeholder="1"
          />
        </View>
      </View>
      {typingNew && (
        <TextField
          label="New series name"
          value={value}
          onChangeText={onChange}
          placeholder="Mistborn"
          autoCapitalize="words"
          autoFocus={creating}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  seriesBlock: { gap: spacing.md },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  heroText: { flex: 1, gap: spacing.xs },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  isbn: { flex: 2 },
  center: { textAlign: "center" },
});
