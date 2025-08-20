<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NotificationEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The notification data.
     *
     * @var array
     */
    public $notification;

    /**
     * The subject of the email.
     *
     * @var string
     */
    public $subject;

    /**
     * The view to use for the email.
     *
     * @var string
     */
    protected $viewName = 'emails.notification';

    /**
     * Create a new message instance.
     *
     * @param  array  $notification
     * @param  string  $subject
     * @return void
     */
    public function __construct($notification, $subject = null)
    {
        $this->notification = $notification;
        $this->subject = $subject ?? ($notification['subject'] ?? 'Notification');
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject($this->subject)
                    ->view($this->viewName, [
                        'notification' => $this->notification,
                        'subject' => $this->subject,
                    ]);
    }

    /**
     * Set a custom view for the email.
     *
     * @param  string  $viewName
     * @return $this
     */
    public function setView($viewName)
    {
        $this->viewName = $viewName;
        return $this;
    }
}
