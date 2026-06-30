import type { FunctionComponent } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { X } from "lucide-preact";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id?: string;
  options?: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
  "aria-errormessage"?: string;
  "aria-required"?: boolean | "false" | "true";
  onBlur?: (e: FocusEvent) => void;
}

export const MultiSelect: FunctionComponent<MultiSelectProps> = ({
  id,
  options = [],
  value,
  onChange,
  placeholder = "Add label...",
  className = "",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-errormessage": ariaErrorMessage,
  "aria-required": ariaRequired,
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [listboxId] = useState(() => 'ms-' + Math.random().toString(36).slice(2, 7));
  const optionIdPrefix = `${listboxId}-opt-`;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase()) ||
    opt.value.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setAnnouncement(`Added ${trimmed}`);
    }
    setInputValue("");
    setActiveIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
    const matchedOption = options.find(o => o.value === tagToRemove);
    setAnnouncement(`Removed ${matchedOption ? matchedOption.label : tagToRemove}`);
    inputRef.current?.focus();
  };

  const toggleOption = (optionValue: string) => {
    const isAdding = !value.includes(optionValue);
    const newValue = isAdding
      ? [...value, optionValue]
      : value.filter((v) => v !== optionValue);
    onChange(newValue);

    const matchedOption = options.find(o => o.value === optionValue);
    const label = matchedOption ? matchedOption.label : optionValue;
    setAnnouncement(isAdding ? `Selected ${label}` : `Unselected ${label}`);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length) {
        toggleOption(filteredOptions[activeIndex].value);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(filteredOptions.length - 1);
      } else {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // If we're clicking inside the container (e.g. an option), don't add tag yet
    // The option click handler will do its job.
    // We can check relatedTarget to see if focus moved within the component.
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }

    // Otherwise it's a real blur
    addTag(inputValue);
    onBlur?.(e);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <div
        className={`flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-[0.95rem] border border-black/[0.06] bg-transparent px-3 py-1.5 transition-colors focus-within:border-signal-500 dark:border-white/[0.07] ${ariaInvalid === 'true' || ariaInvalid === true ? 'border-status-red' : ''}`}
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {value.map((tag) => {
          const matchedOption = options.find(o => o.value === tag);
          const label = matchedOption ? matchedOption.label : tag;
          return (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/[0.08] dark:text-slate-300"
            >
              {label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:text-status-red focus:outline-none"
                aria-label={`Remove ${label}`}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          );
        })}
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-errormessage={ariaErrorMessage}
          aria-required={ariaRequired}
          aria-activedescendant={activeIndex >= 0 && filteredOptions[activeIndex] ? `${optionIdPrefix}${filteredOptions[activeIndex].value}` : undefined}
          value={inputValue}
          onInput={(e) => {
            setInputValue((e.target as HTMLInputElement).value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[60px] flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          ref={listboxRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-black/[0.08] bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-void-800"
        >
          {filteredOptions.map((option, index) => {
            const isSelected = value.includes(option.value);
            const isActive = index === activeIndex;
            return (
              <div
                id={`${optionIdPrefix}${option.value}`}
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`flex cursor-pointer items-center px-3 py-2 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.05] ${
                  isActive ? 'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-signal-500/50' : ''
                } outline-none ${
                  isSelected ? "bg-signal-500/10 text-signal-700 dark:text-signal-400" : "text-slate-700 dark:text-slate-300"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur of input if input had focus
                }}
                onClick={() => {
                  toggleOption(option.value);
                  inputRef.current?.focus();
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  aria-hidden="true"
                  tabIndex={-1}
                  className="mr-2 h-3 w-3 rounded border-slate-300 text-signal-500 focus:ring-signal-500 dark:border-white/[0.18] dark:bg-transparent pointer-events-none"
                />
                {option.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
