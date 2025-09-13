import tkinter as tk
from tkinter import ttk

def start_entertainment_mode():
    """Start the Entertainment Mode GUI"""
    root = tk.Tk()
    root.title("Entertainment Mode - Soil Savvy Suite")
    root.geometry("500x400")
    root.resizable(True, True)
    
    # Configure style
    style = ttk.Style()
    style.theme_use('default')
    
    # Main frame
    main_frame = ttk.Frame(root, padding="20")
    main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
    
    # Configure grid weights
    root.columnconfigure(0, weight=1)
    root.rowconfigure(0, weight=1)
    main_frame.columnconfigure(0, weight=1)
    
    # Title
    title_label = ttk.Label(main_frame, text="🎮 Entertainment Mode", 
                           font=("Arial", 20, "bold"))
    title_label.grid(row=0, column=0, pady=(0, 20))
    
    # Welcome message
    welcome_label = ttk.Label(main_frame, text="Welcome to Entertainment Mode!", 
                             font=("Arial", 14))
    welcome_label.grid(row=1, column=0, pady=(0, 20))
    
    # Features frame
    features_frame = ttk.LabelFrame(main_frame, text="Features", padding="15")
    features_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(0, 20))
    features_frame.columnconfigure(0, weight=1)
    
    # Feature list
    features = [
        "🌱 Interactive plant care games",
        "🎯 Daily plant care challenges", 
        "🏆 Achievement system",
        "📊 Fun statistics and progress tracking",
        "🎨 Plant customization options"
    ]
    
    for i, feature in enumerate(features):
        feature_label = ttk.Label(features_frame, text=feature, font=("Arial", 11))
        feature_label.grid(row=i, column=0, sticky=tk.W, pady=2)
    
    # Action buttons frame
    buttons_frame = ttk.Frame(main_frame)
    buttons_frame.grid(row=3, column=0, pady=20)
    
    # Start Game button
    start_button = ttk.Button(buttons_frame, text="🎮 Start Game", 
                             command=lambda: show_message("Game feature coming soon!"))
    start_button.grid(row=0, column=0, padx=5)
    
    # View Achievements button  
    achievements_button = ttk.Button(buttons_frame, text="🏆 Achievements",
                                   command=lambda: show_message("Achievements feature coming soon!"))
    achievements_button.grid(row=0, column=1, padx=5)
    
    # Close button
    close_button = ttk.Button(buttons_frame, text="❌ Close", command=root.destroy)
    close_button.grid(row=0, column=2, padx=5)
    
    def show_message(message):
        """Show a simple message dialog"""
        msg_window = tk.Toplevel(root)
        msg_window.title("Information")
        msg_window.geometry("300x100")
        msg_window.transient(root)
        msg_window.grab_set()
        
        ttk.Label(msg_window, text=message, font=("Arial", 11)).pack(expand=True)
        ttk.Button(msg_window, text="OK", command=msg_window.destroy).pack(pady=10)
    
    # Center the window
    root.update_idletasks()
    x = (root.winfo_screenwidth() // 2) - (root.winfo_width() // 2)
    y = (root.winfo_screenheight() // 2) - (root.winfo_height() // 2)
    root.geometry(f"+{x}+{y}")
    
    root.mainloop()
    return root

if __name__ == "__main__":
    start_entertainment_mode()
