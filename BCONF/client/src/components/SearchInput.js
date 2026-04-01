function SearchInput({
    id,
    label,
    placeholder,
    value,
    onChange,
    helperText,
}) {
    return (
        <div className="search-control">
            <label className="search-label" htmlFor={id}>{label}</label>
            <div className="search-input-row">
                <input
                    id={id}
                    className="search-input"
                    type="search"
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                {value && (
                    <button
                        className="search-clear"
                        type="button"
                        onClick={() => onChange("")}
                        aria-label={`Clear ${label.toLowerCase()}`}
                    >
                        Clear
                    </button>
                )}
            </div>
            <p className="search-helper" aria-live="polite">{helperText}</p>
        </div>
    );
}

export default SearchInput;
