-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Clean up existing cron job if it exists
SELECT cron.unschedule('process-vectorization-queue');

-- Function to process the queue
CREATE OR REPLACE FUNCTION process_vectorization_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response http_response;
BEGIN
    -- Make HTTP request to processing endpoint
    SELECT * INTO v_response FROM http((
        'POST',
        'https://turbo-grant.vercel.app/api/vectorization/process-queue',
        ARRAY[http_header('Content-Type', 'application/json')],
        'application/json',
        '{"source": "cron"}'
    )::http_request);

    -- Raise warning if status is not 200
    IF v_response.status != 200 THEN
        RAISE WARNING 'Queue processing request failed with status %', v_response.status;
    END IF;
END;
$$;

-- Set up the cron job to run every minute
SELECT cron.schedule(
    'process-vectorization-queue',  -- job name
    '* * * * *',                   -- every minute
    $$SELECT process_vectorization_queue()$$
);
