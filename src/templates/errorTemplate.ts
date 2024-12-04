export const errorTemplate = (errorMessage: string, errorDetails: string): string => {
    return `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f5c2c7; border-radius: 8px; background-color: #f8d7da; color: #842029; font-family: Arial, sans-serif; text-align: center; box-sizing: border-box;">
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #721c24;">${errorMessage}</h1>
        <div style="font-size: 16px; margin-top: 15px; color: #842029;">
          <p style="margin: 5px 0;">Sorry, an error occurred!</p>
          <p style="margin: 5px 0;">${errorDetails}</p>
        </div>
      </div>
    `;
  };
  