import React, { useState } from "react";
import Avatar from "../Avatar/Avatar";
import "./LineSelect.css";

const LineSelect = ({
  label,
  required,
  value,
  onChange,
  placeholder = "Select",
  options = [],
  emptyText = "Nothing to select",
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((row) => row.id === value);

  return (
    <div className="fc-line-select">
      {label ? (
        <span className="fc-line-select__label">
          {label}
          {required ? <span className="fc-line-select__req"> *</span> : null}
        </span>
      ) : null}
      <div className={`fc-line-select__combo${open ? " is-open" : ""}`}>
        <button
          type="button"
          className="fc-line-select__trigger"
          onClick={() => setOpen((on) => !on)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected ? (
            <>
              {selected.photo !== undefined || selected.name ? (
                <Avatar src={selected.photo} name={selected.name || selected.label} />
              ) : null}
              <span className="fc-line-select__copy">
                <strong>{selected.label}</strong>
                {selected.sub ? <em>{selected.sub}</em> : null}
              </span>
            </>
          ) : (
            <span className="fc-line-select__placeholder">{placeholder}</span>
          )}
          <span className="fc-line-select__caret" aria-hidden="true" />
        </button>
        {open ? (
          <ul className="fc-line-select__menu" role="listbox">
            {options.length ? (
              options.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`fc-line-select__option${row.id === value ? " is-selected" : ""}`}
                    onClick={() => {
                      onChange(row.id);
                      setOpen(false);
                    }}
                  >
                    {row.photo !== undefined || row.name ? (
                      <Avatar src={row.photo} name={row.name || row.label} />
                    ) : null}
                    <span className="fc-line-select__copy">
                      <strong>{row.label}</strong>
                      {row.sub ? <em>{row.sub}</em> : null}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="fc-line-select__empty">{emptyText}</li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default LineSelect;
