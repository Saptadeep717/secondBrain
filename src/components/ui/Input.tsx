interface InputProps { 
    placeholder: string; // Placeholder text for the input field
    reference?: any ;// Optional reference to the input field for accessing its value or methods
    props?:string;
    type?:string;
}

export function Input({placeholder, reference,props,type}: InputProps) {
    return (
        <div>
            {/* Input field with the provided placeholder and reference */}
            <input 
                ref={reference} // Attaching the reference to the input field
                placeholder={placeholder} // Setting the placeholder text for the input field
                type={type || "text"} // Defining the input type as text
                className={`px-4 py-2 bg-off-white border rounded m-2 ${props}`} // Tailwind CSS classes for styling the input field
            />
        </div>
    );
}