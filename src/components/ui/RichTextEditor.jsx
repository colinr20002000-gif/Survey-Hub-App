import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Type, Minus, Plus, Palette } from 'lucide-react';

// Custom Font Size Extension
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace('px', ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}px`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

const MenuBar = ({ editor }) => {
    const [isColorPickerOpen, setIsColorPickerOpen] = React.useState(false);
    const colorPickerRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setIsColorPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded transition-colors ${
                isActive
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );

    const incrementFontSize = (increment) => {
        const currentSize = parseInt(editor.getAttributes('textStyle').fontSize) || 14; // Default to 14px
        const newSize = Math.max(10, Math.min(72, currentSize + increment)); // Min 10px, Max 72px
        editor.chain().focus().setFontSize(newSize).run();
    };

    const setFontSize = (size) => {
        editor.chain().focus().setFontSize(parseInt(size)).run();
    };

    const fontSizeOptions = [10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];
    const currentFontSize = parseInt(editor.getAttributes('textStyle').fontSize) || 14;

    const colors = ['#000000', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6'];

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
            >
                <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
            >
                <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline"
            >
                <UnderlineIcon size={16} />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-0.5">
                <button
                    onClick={() => incrementFontSize(-2)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                    title="Decrease Font Size"
                >
                    <Minus size={12} />
                </button>
                
                <select
                    value={currentFontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="h-6 text-xs bg-transparent text-gray-700 dark:text-gray-300 border-none outline-none cursor-pointer w-12 text-center appearance-none hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                    title="Select Font Size"
                >
                    {fontSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>

                <button
                    onClick={() => incrementFontSize(2)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                    title="Increase Font Size"
                >
                    <Plus size={12} />
                </button>
            </div>

            <div className="relative" ref={colorPickerRef}>
                <ToolbarButton
                    onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                    isActive={isColorPickerOpen}
                    title="Text Color"
                >
                    <Palette size={16} style={{ color: editor.getAttributes('textStyle').color || 'currentColor' }} />
                </ToolbarButton>
                {isColorPickerOpen && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg flex gap-1 z-50">
                        {colors.map(color => (
                            <button
                                key={color}
                                className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    editor.chain().focus().setColor(color).run();
                                    setIsColorPickerOpen(false);
                                }}
                                title={color}
                            />
                        ))}
                        <input
                            type="color"
                            className="w-5 h-5 p-0 border-0 rounded-full overflow-hidden"
                            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                            value={editor.getAttributes('textStyle').color || '#000000'}
                        />
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List size={16} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Ordered List"
            >
                <ListOrdered size={16} />
            </ToolbarButton>
        </div>
    );
};

const RichTextEditor = ({ value, onChange, placeholder }) => {
    // Force re-render on editor updates to sync toolbar state
    const [, forceUpdate] = React.useState({});

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            FontSize,
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onTransaction: () => {
            forceUpdate({});
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-sm',
            },
        },
    });

    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            if (Math.abs(editor.getText().length - (value?.length || 0)) > 5 || (value === '' && editor.getText().length > 0)) {
                 editor.commands.setContent(value || '');
            }
        }
    }, [value, editor]);

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
            <style>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #9ca3af;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .ProseMirror {
                    min-height: 150px;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                    padding-left: 1.5em;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5em;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
