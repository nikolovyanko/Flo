const getTodayDate = async () => {
    const url = 'https://worldtimeapi.org/api/timezone/Europe/London';
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            const response = await axios.get(url);
            const datetime = response.data.datetime;
            return datetime;
        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                console.error('Failed to fetch date after multiple attempts', error);
                throw error;
            }
            console.log('Retrying request...');
        }
    }
};
export { getTodayDate };