import Clock from './clock'
function Timer() {
    return (
        <div className="p-4 flex flex-col items-center justify-center gap-8">
            <div className="flex gap-3 md:gap-8 lg:gap-12">
                <Clock unit="hour" />
                <Clock unit="minute" />
                <Clock unit="second" />
            </div>
        </div>
    );
}

export { Timer };
export default Timer;